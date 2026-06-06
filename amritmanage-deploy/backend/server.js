const path = require('path');
const dotenv = require('dotenv');

const fs = require('fs');

// Detect if running inside a nested 'backend' folder (development) or collapsed at root (production)
const isNested = __dirname.endsWith('backend');
const rootEnvPath = isNested ? path.join(__dirname, '..', '.env') : path.join(__dirname, '.env');
const backendEnvPath = path.join(__dirname, '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (isNested && fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

// Load .env.local overrides in development only — never in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');

// ── Route imports ─────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const superadminRoutes = require('./routes/superadmin');
const ownerRoutes = require('./routes/owner');
const staffRoutes = require('./routes/staff');
const whatsappRoutes = require('./routes/whatsapp');
const paymentRoutes = require('./routes/payment');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── Trust proxy ───────────────────────────────────────────────
app.set('trust proxy', 1);

// ── Connect DB ────────────────────────────────────────────────
connectDB();

// ── Security middleware ───────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: isProd
        ? ["'self'", process.env.FRONTEND_URL]
        : ["'self'", 'http://localhost:5173'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xContentTypeOptions: true,
}));
app.disable('x-powered-by');
app.use(mongoSanitize());
app.use(compression({ level: 6, threshold: 1024 }));



// ── CORS (all other routes) ───────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    try {
      const hostname = new URL(origin).hostname;
      if (
        hostname === 'amritmanage-app.eurekai.in' ||
        hostname.endsWith('.eurekai.in') ||
        hostname.endsWith('.hostingersite.com') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      ) {
        return callback(null, true);
      }
    } catch (_) {}
    
    callback(null, false); // fallback to deny if no match
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rate limiting ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Logging ───────────────────────────────────────────────────
// 'combined' in production (Apache format, good for log aggregators)
// 'dev' in development (colourised, concise)
app.use(morgan(isProd ? 'combined' : 'dev'));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Server-side in-memory cache ───────────────────────────────
const _serverCache = new Map();
const serverCache = {
  get: (key) => {
    const e = _serverCache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { _serverCache.delete(key); return null; }
    return e.data;
  },
  set: (key, data, ttlMs = 60000) => {
    _serverCache.set(key, { data, expiresAt: Date.now() + ttlMs });
    if (_serverCache.size > 1000) {
      const firstKey = _serverCache.keys().next().value;
      _serverCache.delete(firstKey);
    }
  },
  del: (key) => _serverCache.delete(key),
  delPrefix: (prefix) => {
    for (const k of _serverCache.keys()) {
      if (k.startsWith(prefix)) _serverCache.delete(k);
    }
  }
};
app.locals.serverCache = serverCache;

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, express.json({ limit: '4kb' }), authRoutes);
app.use('/api/superadmin', apiLimiter, superadminRoutes);
app.use('/api/owner', apiLimiter, ownerRoutes);
app.use('/api/staff', apiLimiter, staffRoutes);
app.use('/api/whatsapp', apiLimiter, whatsappRoutes);
app.use('/api/payment', apiLimiter, paymentRoutes);

// ── API 404 — unknown /api/* routes ──────────────────────────
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ── Serve React frontend (production) ─────────────────────────
// The built frontend/dist is served as static files.
// Any non-API route falls back to index.html so React Router works.
const frontendDist = isNested 
  ? path.join(__dirname, '..', 'frontend', 'dist')
  : path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (!isProd) console.error('Global error:', err);
  const status = err.statusCode || err.status || 500;
  const message = isProd
    ? (status < 500 ? err.message : 'An unexpected error occurred. Please try again.')
    : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  console.log(`🚀 Amrit Manage backend running on port ${PORT}`);
  
  const PlanConfig = require('./models/PlanConfig');
  PlanConfig.countDocuments().then(count => {
    if (count < 3) {
      const { seedPlanConfigs } = require('./scripts/seedPlanConfigs');
      seedPlanConfigs(true)
        .then(() => console.log('[SEED] Plan configs auto-seeded.'))
        .catch(err => console.warn('[SEED] Plan config seed failed:', err.message));
    }
  }).catch(() => { });
  // Reset pairing attempts on startup (re-deploy / restart)
  try {
    const WhatsappConnection = require('./models/WhatsappConnection');
    await WhatsappConnection.updateMany({}, { $set: { pairing_attempts_timestamps: [] } });
    console.log('🔄 Reset all WhatsApp pairing attempt limits on startup.');
  } catch (err) {
    console.error('Failed to reset WhatsApp pairing attempt limits on startup:', err.message);
  }

  // Migrate 'daily_owner' to 'dairy_owner' in User collection
  try {
    const User = require('./models/User');
    const result = await User.updateMany({ ownerRole: 'daily_owner' }, { $set: { ownerRole: 'dairy_owner' } });
    if (result.modifiedCount > 0) {
      console.log(`🔄 Migrated ${result.modifiedCount} existing 'daily_owner' roles to 'dairy_owner'.`);
    }
  } catch (err) {
    console.error('Failed to migrate daily_owner to dairy_owner roles on startup:', err.message);
  }

  // Sync staff ownerRole with owner's ownerRole
  try {
    const User = require('./models/User');
    const staffs = await User.find({ role: 'staff' });
    let updatedCount = 0;
    for (const staff of staffs) {
      if (staff.ownerId) {
        const owner = await User.findById(staff.ownerId);
        if (owner && staff.ownerRole !== owner.ownerRole) {
          staff.ownerRole = owner.ownerRole;
          await staff.save({ validateBeforeSave: false });
          updatedCount++;
        }
      }
    }
    if (updatedCount > 0) {
      console.log(`🔄 Synced ${updatedCount} staff ownerRole settings with their owners.`);
    }
  } catch (err) {
    console.error('Failed to sync staff ownerRole values on startup:', err.message);
  }

  // WhatsApp sessions recovery
  const { reconnectActiveSessions } = require('./services/whatsappService');
  reconnectActiveSessions().catch(err => {
    console.error('WhatsApp session recovery failed on startup:', err.message);
  });
});

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app;
