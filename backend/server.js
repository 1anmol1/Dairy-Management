const path = require('path');
const dotenv = require('dotenv');

// Load base .env (production values)
dotenv.config({ path: path.join(__dirname, '.env') });

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
const authRoutes       = require('./routes/auth');
const setupRoutes      = require('./routes/setup');
const superadminRoutes = require('./routes/superadmin');
const ownerRoutes      = require('./routes/owner');
const staffRoutes      = require('./routes/staff');
const whatsappRoutes   = require('./routes/whatsapp');
const paymentRoutes    = require('./routes/payment');

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
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'blob:'],
      connectSrc:  isProd
        ? ["'self'", process.env.FRONTEND_URL]
        : ["'self'", 'http://localhost:5173'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
    }
  },
  referrerPolicy:              { policy: 'strict-origin-when-cross-origin' },
  hsts:                        isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  frameguard:                  { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xContentTypeOptions:         true,
}));
app.disable('x-powered-by');
app.use(mongoSanitize());
app.use(compression({ level: 6, threshold: 1024 }));

// ── Setup UI — served at /setup ───────────────────────────────
// Localhost-only. Disabled in production unless ENABLE_SETUP=true.
// CSP is relaxed here to allow the inline <script> in setup-ui.html.
app.get('/setup', (req, res) => {
  if (isProd && process.env.ENABLE_SETUP !== 'true') {
    return res.status(404).send('Not found.');
  }
  const ip = req.ip || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal) return res.status(404).send('Not found.');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none';"
  );
  res.sendFile(path.join(__dirname, 'setup-ui.html'));
});

// ── Setup API — registered BEFORE global CORS ─────────────────
// Disabled in production unless ENABLE_SETUP=true is explicitly set.
const setupCors = cors({
  origin: (origin, cb) => {
    const ok = !origin || origin === 'null' ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    cb(null, ok);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
});
// Use regex to avoid Express 5 wildcard parsing issues
app.options(/^\/api\/setup\/.*/, setupCors);
app.use('/api/setup', (req, res, next) => {
  if (isProd && process.env.ENABLE_SETUP !== 'true') {
    return res.status(404).json({ error: 'Not found.' });
  }
  next();
}, setupCors, express.json({ limit: '4kb' }), setupRoutes);

// ── CORS (all other routes) ───────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.use('/api/auth',       authLimiter, express.json({ limit: '4kb' }), authRoutes);
app.use('/api/superadmin', apiLimiter,  superadminRoutes);
app.use('/api/owner',      apiLimiter,  ownerRoutes);
app.use('/api/staff',      apiLimiter,  staffRoutes);
app.use('/api/whatsapp',   apiLimiter,  whatsappRoutes);
app.use('/api/payment',    apiLimiter,  paymentRoutes);

// ── API 404 — unknown /api/* routes ──────────────────────────
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ── Serve React frontend (production) ─────────────────────────
// The built frontend/dist is served as static files.
// Any non-API route falls back to index.html so React Router works.
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
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
const server = app.listen(PORT, () => {
  console.log(`🚀 Amrit Manage backend running on port ${PORT}`);
  if (!isProd || process.env.ENABLE_SETUP === 'true') {
    console.log(`🔧 Setup UI available at: http://localhost:${PORT}/setup`);
  }
  const PlanConfig = require('./models/PlanConfig');
  PlanConfig.countDocuments().then(count => {
    if (count < 3) {
      const { seedPlanConfigs } = require('./scripts/seedPlanConfigs');
      seedPlanConfigs(true)
        .then(() => console.log('[SEED] Plan configs auto-seeded.'))
        .catch(err => console.warn('[SEED] Plan config seed failed:', err.message));
    }
  }).catch(() => {});
  // WhatsApp sessions are NOT restored on startup.
  // Chrome launches on-demand when owner opens the WhatsApp page (/api/whatsapp/qr).
  // This keeps startup fast and memory usage low on shared hosting.
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
