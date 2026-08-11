const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PlanConfig = require('../models/PlanConfig');

// ── Gold features (trial benefit) ────────────────────────────
// Cached in memory to avoid DB hit on every request.
// Refreshed every 5 minutes.
let _goldFeaturesCache = null;
let _goldFeaturesCacheTs = 0;

const getGoldFeatures = async () => {
  if (_goldFeaturesCache && Date.now() - _goldFeaturesCacheTs < 5 * 60 * 1000) {
    return _goldFeaturesCache;
  }
  try {
    const cfg = await PlanConfig.findOne({ plan: 'gold' }).lean();
    if (cfg) {
      _goldFeaturesCache = cfg.features;
      _goldFeaturesCacheTs = Date.now();
      return _goldFeaturesCache;
    }
  } catch (_) { /* ignore */ }
  // Hardcoded fallback if PlanConfig not seeded
  return { whatsapp_alerts: true, pdf_billing: true, advanced_reports: false };
};

// ── Owner subscription cache (avoids DB hit on every staff request) ──
// Key: ownerId string → { owner, cachedAt }
const _ownerSubCache = new Map();
const OWNER_CACHE_TTL = 60 * 1000; // 1 minute

const getCachedOwner = async (ownerId) => {
  const key = ownerId.toString();
  const cached = _ownerSubCache.get(key);
  if (cached && Date.now() - cached.cachedAt < OWNER_CACHE_TTL) {
    return cached.owner;
  }
  const owner = await User.findById(ownerId).select('subscription features isActive').lean();
  if (owner) {
    _ownerSubCache.set(key, { owner, cachedAt: Date.now() });
    // Prevent unbounded growth — evict oldest entries if cache > 500
    if (_ownerSubCache.size > 500) {
      const firstKey = _ownerSubCache.keys().next().value;
      _ownerSubCache.delete(firstKey);
    }
  }
  return owner;
};

// Exported so routes can invalidate cache when subscription changes
const invalidateOwnerCache = (ownerId) => {
  _ownerSubCache.delete(ownerId.toString());
};

// ── Verify JWT and attach user to request ─────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been disabled. Contact support.' });
    }

    user.impersonated = !!decoded.impersonatedBy;
    user.impersonatedBy = decoded.impersonatedBy;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ── Role-based access control ─────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`
      });
    }
    next();
  };
};

// ── Subscription check (for owner routes) ────────────────────
const requireActiveSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role === 'superadmin' || user.impersonatedBy === 'superadmin') return next();

    // For staff, use cached owner lookup to avoid DB hit on every request
    let owner = user;
    if (user.role === 'staff') {
      owner = await getCachedOwner(user.ownerId);
      if (!owner) {
        return res.status(403).json({ error: 'Owner account not found.' });
      }
    }

    // Normalise flat Supabase columns into a subscription object
    const { status, trialEndsAt, expiresAt } = {
      status:      owner.subscriptionStatus || owner.subscription?.status || 'trial',
      trialEndsAt: owner.trialEndsAt        || owner.subscription?.trialEndsAt,
      expiresAt:   owner.expiresAt          || owner.subscription?.expiresAt,
    };

    if (status === 'inactive') {
      return res.status(403).json({
        error: 'Subscription inactive. Please contact support.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    const isTrialExpired = status === 'trial' && trialEndsAt && new Date() > new Date(trialEndsAt);
    const isSubExpired = status === 'expired' || (expiresAt && new Date() > new Date(expiresAt));

    if (isTrialExpired || isSubExpired) {
      if (user.role === 'staff') {
        return res.status(403).json({
          error: 'Plan expired contact owner',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
      if (user.role === 'owner') {
        if (req.method === 'GET') {
          // Allow GET requests for read-only viewing of dashboard/data
          if (status === 'trial') {
            const goldFeatures = await getGoldFeatures();
            req.effectiveFeatures = { ...goldFeatures };
          } else {
            req.effectiveFeatures = { ...(owner?.features?.toObject?.() || owner?.features || {}) };
          }
          return next();
        } else {
          return res.status(403).json({
            error: 'Subscription has expired. Please renew.',
            code: 'SUBSCRIPTION_EXPIRED'
          });
        }
      }
    }

    // ── Trial users get Gold plan features ────────────────────
    // Attach effective features to req so downstream can use them.
    if (status === 'trial') {
      const goldFeatures = await getGoldFeatures();
      // Merge gold features onto the owner object in-memory (not saved to DB)
      req.effectiveFeatures = { ...goldFeatures };
    } else {
      req.effectiveFeatures = { ...(owner?.features?.toObject?.() || owner?.features || {}) };
    }

    next();
  } catch (err) {
    next(err);
  }
};

// ── Feature flag check ────────────────────────────────────────
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Use effectiveFeatures if set by requireActiveSubscription (handles trial = gold)
      if (req.effectiveFeatures) {
        if (!req.effectiveFeatures[featureName]) {
          return res.status(403).json({
            error: `Feature '${featureName}' is not enabled for your account.`,
            code: 'FEATURE_DISABLED'
          });
        }
        return next();
      }

      let owner = req.user;
      if (req.user.role === 'staff') {
        owner = await User.findById(req.user.ownerId);
      }
      if (!owner || !owner.features[featureName]) {
        return res.status(403).json({
          error: `Feature '${featureName}' is not enabled for your account.`,
          code: 'FEATURE_DISABLED'
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    // Main superadmin has no parentAdminId, so they have all permissions
    if (req.user.role === 'superadmin' && !req.user.parentAdminId) {
      return next();
    }
    // Sub-admins have parentAdminId and their permissions are listed
    if (req.user.role === 'superadmin' && req.user.parentAdminId) {
      if (req.user.permissions && req.user.permissions.includes(permission)) {
        return next();
      }
      return res.status(403).json({ error: `Access denied. Requires '${permission}' permission.` });
    }
    // If not superadmin, let other middlewares handle it
    next();
  };
};

module.exports = { protect, authorize, requireActiveSubscription, requireFeature, invalidateOwnerCache, checkPermission };
