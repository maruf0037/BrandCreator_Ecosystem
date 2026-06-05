require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const qcEnrichmentRoutes = require('./routes/qcEnrichmentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const securityAlertRoutes = require('./routes/securityAlertRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const locationAdsRoutes = require('./routes/locationAdsRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const walletRoutes = require('./routes/walletRoutes');
const returnRoutes = require('./routes/returnRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const healthRoutes = require('./src/routes/healthRoutes');

// Observability Additions
const reqId = require("./src/middleware/reqId");
const httpLogger = require("./src/middleware/httpLogger");
const httpMetrics = require("./src/middleware/httpMetrics");
const { metricsHandler } = require("./src/metrics");
const logger = require("./src/logger");

const { startEnrichmentRetryWorker } = require('./controllers/qcEnrichmentController');
const { poolPromise, dbDisabled } = require('./config/db');

const app = express();
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8080',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://100.110.252.19:5173',
  'http://100.110.252.19:8080'
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.app.github.dev')) return callback(null, true); // allow app.github.dev origins
    return callback(new Error(`CORS origin blocked: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

// Global Observability Pipeline in execution order
app.use(reqId);
app.use(httpMetrics);
app.use(httpLogger);

// Prometheus metric scraper endpoint
app.get('/metrics', metricsHandler);

// Session middleware for passport auth support
app.use(session({
  secret: process.env.SESSION_SECRET || 'brandcreator_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Health endpoint checks SQL connectivity
app.get('/health', async (_req, res) => {
  if (dbDisabled) {
    return res.status(503).json({ status: 'degraded', db: 'disabled', error: 'SQL Server not configured' });
  }

  try {
    const pool = await poolPromise;
    await pool.request().query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'sqlserver' });
  } catch (err) {
    res.status(500).json({ status: 'fail', db: 'sqlserver', error: err.message });
  }
});

// AI health endpoint with optional provider ping (placeholder)
app.get('/health/ai', async (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const reachable = hasKey; // placeholder
  res.json({ ai: hasKey ? 'configured' : 'missing_key', reachable });
});

// Register static uploads serving
const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Register routers
app.use('/auth', authRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', qcEnrichmentRoutes);
app.use('/api', orderRoutes);
app.use('/api', securityAlertRoutes);
app.use('/api', pricingRoutes);
app.use('/api', locationAdsRoutes);
app.use('/api/admin/campaigns', campaignRoutes);
app.use('/api', whatsappRoutes);
app.use('/api', walletRoutes);
app.use('/api', returnRoutes);
app.use('/api', uploadRoutes);
app.use('/api', commissionRoutes);
app.use('/api', revenueRoutes);
app.use('/', healthRoutes); // GET /health/deep

// Global http error tracking middleware
app.use((err, req, res, _next) => {
  logger.error({
    event: "http.error",
    reqId: req.reqId,
    route: req.originalUrl,
    method: req.method,
    message: err.message
  });
  res.status(500).json({ error: "INTERNAL_ERROR", reqId: req.reqId });
});

const port = process.env.PORT || 5000;
app.listen(port, async () => {
  if (dbDisabled) {
    console.warn('bc_engine is running in degraded mode: SQL Server is not configured. Some endpoints may be unavailable.');
    console.log(`bc_engine running on port ${port}`);
    return;
  }

  try {
    const pool = await poolPromise; // ensure DB connection on start
    console.log(`bc_engine running on port ${port}`);

    // Pre-warm active webhook key versions setup for backward testing stability
    try {
      const activeKeyCheck = await pool.request()
        .input('secretType', 'WEBHOOK')
        .query("SELECT COUNT(*) AS total FROM dbo.SecretVersions WHERE SecretType = @secretType AND IsActive = 1");

      if (activeKeyCheck.recordset[0].total === 0) {
        await pool.request()
          .input('secretType', 'WEBHOOK')
          .input('keyId', 'wk_2026_05')
          .input('val', 'webhook_secret_placeholder')
          .query("INSERT INTO dbo.SecretVersions (SecretType, KeyId, SecretValue, IsActive) VALUES (@secretType, @keyId, @val, 1)");
      }
    } catch (e) {
      console.warn('SecretVersions warmup skipped:', e.message);
    }
    
    // Start AI enrichment background retry worker
    startEnrichmentRetryWorker();
  } catch (err) {
    console.error('SQL connection failed on startup:', err.message);
    process.exit(1);
  }
});
