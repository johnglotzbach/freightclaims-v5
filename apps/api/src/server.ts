/**
 * Server Entry Point - Express application bootstrap
 *
 * Sets up all middleware, routes, error handling, and graceful shutdown.
 * This is the main file that gets compiled and run in production.
 *
 * Location: apps/api/src/server.ts
 * Related: apps/api/src/config/env.ts (environment)
 *          apps/api/src/routes/ (all route definitions)
 *          apps/api/src/middleware/ (middleware chain)
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler.middleware';
import { apiLimiter } from './middleware/rate-limiter.middleware';
import { tenantIsolation } from './middleware/tenant.middleware';
import { auditLog } from './middleware/audit.middleware';
import { initCache } from './utils/cache';
import { readonlyGuard } from './middleware/readonly.middleware';

// Route imports
import { claimsRouter } from './routes/claims.routes';
import { usersRouter } from './routes/users.routes';
import { customersRouter } from './routes/customers.routes';
import { shipmentsRouter } from './routes/shipments.routes';
import { documentsRouter } from './routes/documents.routes';
import { emailRouter } from './routes/email.routes';
import { searchRouter } from './routes/search.routes';
import { reportsRouter } from './routes/reports.routes';
import { automationRouter } from './routes/automation.routes';
import { aiRouter } from './routes/ai.routes';
import { emailSubmissionRouter } from './routes/email-submission.routes';
import { contractsRouter } from './routes/contracts.routes';
import { onboardingRouter } from './routes/onboarding.routes';
import { chatbotRouter } from './routes/chatbot.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { adminRouter } from './routes/admin.routes';
import { newsRouter } from './routes/news.routes';
import { usageRouter } from './routes/usage.routes';
import { dashboardsRouter } from './routes/dashboards.routes';
import { webhooksRouter } from './routes/webhooks.routes';
import { scheduledReportsRouter } from './routes/scheduled-reports.routes';
import { acknowledgeRouter } from './routes/acknowledge.routes';
import { carriersRouter } from './routes/carriers.routes';

const app: express.Application = express();

// Behind Render's load balancer + Cloudflare — trust the first proxy
// so req.ip returns the real client IP and rate-limiter works correctly.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Global middleware (order matters)
// ---------------------------------------------------------------------------

// Security headers -- CSP, HSTS, X-Frame-Options, etc.
app.use(helmet());

// CORS -- restrict to known domains in production
app.use(
  cors({
    origin: env.NODE_ENV === 'production'
      ? [env.NEXT_PUBLIC_APP_URL, 'https://freightclaims.com', 'https://freightclaims.ai']
      : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Corporate-Id', 'X-Request-ID'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  }),
);

// Gzip response compression
app.use(compression());

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout — abort requests exceeding 120 seconds for uploads, 30 seconds otherwise
app.use((req, res, next) => {
  const isUpload = req.path.includes('/upload') || req.path.includes('/mass-upload');
  const timeout = isUpload ? 120_000 : 30_000;
  req.setTimeout(timeout, () => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, error: 'Request timed out' });
    }
  });
  next();
});

// Structured HTTP request logging
app.use(pinoHttp({ logger }));

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// Read-only mode guard (for dev servers connected to production DB)
app.use(readonlyGuard);

// ---------------------------------------------------------------------------
// Health check endpoints (no auth required)
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '5.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});

app.get('/ai-health', async (_req, res) => {
  try {
    const { env: appEnv } = await import('./config/env');
    const keyPresent = !!(appEnv.GEMINI_API_KEY && appEnv.GEMINI_API_KEY.trim().length > 0);
    if (!keyPresent) {
      return res.json({ status: 'misconfigured', model: appEnv.AI_MODEL, error: 'GEMINI_API_KEY is not configured' });
    }
    const { generateContent } = await import('./services/agents/gemini-client');
    const result = await generateContent('What is a freight claim? Answer in one sentence.', { config: { maxOutputTokens: 100, temperature: 0.3 } });
    res.json({ status: 'ok', model: appEnv.AI_MODEL, testResponse: result.text.trim() });
  } catch (err: any) {
    logger.error({ err }, 'AI health check failed');
    res.json({ status: 'error', error: 'AI service unavailable' });
  }
});

// ---------------------------------------------------------------------------
// Local file serving (when STORAGE_MODE=local)
// ---------------------------------------------------------------------------

import { storageService } from './services/storage.service';
import { authenticate, softAuthenticate } from './middleware/auth.middleware';

app.get('/api/v1/files/*', authenticate, async (req, res) => {
  try {
    const key = decodeURIComponent(req.params[0]);

    if (key.includes('..')) {
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }

    const user = (req as any).user;
    if (user && !user.isSuperAdmin) {
      const tenantPrefix = `tenant/${user.corporateId}/`;
      if (!key.startsWith(tenantPrefix) && !key.startsWith('tenant/_global/')) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const { body, contentType } = await storageService.downloadDocument(key);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${key.split('/').pop()}"`);
    res.send(body);
  } catch (err: any) {
    if (err?.code === 'ENOENT' || err?.message?.includes('Path traversal') || err?.message?.includes('Invalid storage key')) {
      res.status(404).json({ success: false, error: 'File not found' });
    } else {
      logger.error({ err }, 'File download error');
      res.status(500).json({ success: false, error: 'Failed to download file' });
    }
  }
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------

const v1: express.Router = express.Router();

// Public routes (no auth) — must be registered before auth middleware
v1.use('/acknowledge', acknowledgeRouter);
v1.use('/webhooks', webhooksRouter);

// softAuthenticate extracts req.user from the JWT (if present) without
// rejecting unauthenticated requests. This ensures tenantIsolation and
// auditLog can read user context. Per-route `authenticate` still enforces auth.
v1.use(softAuthenticate);
v1.use(tenantIsolation);
v1.use(auditLog);

v1.use('/claims', claimsRouter);
v1.use('/users', usersRouter);
v1.use('/customers', customersRouter);
v1.use('/shipments', shipmentsRouter);
v1.use('/documents', documentsRouter);
v1.use('/email', emailRouter);
v1.use('/search', searchRouter);
v1.use('/reports/scheduled', scheduledReportsRouter);
v1.use('/reports', reportsRouter);
v1.use('/automation', automationRouter);
v1.use('/ai', aiRouter);
v1.use('/email-submission', emailSubmissionRouter);
v1.use('/contracts', contractsRouter);
v1.use('/onboarding', onboardingRouter);
v1.use('/chatbot', chatbotRouter);
v1.use('/notifications', notificationsRouter);
v1.use('/admin', adminRouter);
v1.use('/news', newsRouter);
v1.use('/usage', usageRouter);
v1.use('/dashboards', dashboardsRouter);
v1.use('/carriers', carriersRouter);

app.use('/api/v1', v1);

// ---------------------------------------------------------------------------
// Global error handler (must be LAST middleware)
// ---------------------------------------------------------------------------

app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server startup and graceful shutdown
// ---------------------------------------------------------------------------

// Initialize cache layer (connects to Redis if available)
initCache().catch((err) => logger.warn({ err }, 'Cache init failed — memory-only mode'));

async function ensureSchemaSync() {
  const fixes: string[] = [];
  const run = async (sql: string, label: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      fixes.push(label);
    } catch (_) { /* already applied or not needed */ }
  };

  await run(`ALTER TABLE claim_documents ALTER COLUMN claim_id DROP NOT NULL`, 'claim_documents.claim_id nullable');
  await run(`ALTER TABLE claim_documents ALTER COLUMN category_id DROP NOT NULL`, 'claim_documents.category_id nullable');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan_type TEXT`, 'customers.plan_type added');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 1`, 'customers.max_users added');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_email TEXT`, 'customers.billing_email added');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0`, 'users.failed_login_attempts added');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`, 'users.locked_until added');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT`, 'users.two_factor_secret added');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE`, 'users.two_factor_enabled added');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner_id TEXT`, 'customers.owner_id added');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS filing_status TEXT DEFAULT 'unfiled'`, 'claim_parties.filing_status added');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS filed_date TIMESTAMP`, 'claim_parties.filed_date added');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS acknowledged_date TIMESTAMP`, 'claim_parties.acknowledged_date added');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS carrier_claim_number TEXT`, 'claim_parties.carrier_claim_number added');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS carrier_response TEXT`, 'claim_parties.carrier_response added');
  await run(`ALTER TABLE claim_documents ADD COLUMN IF NOT EXISTS thumbnail_key TEXT`, 'claim_documents.thumbnail_key added');

  await run(`CREATE TABLE IF NOT EXISTS usage_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    corporate_id TEXT NOT NULL,
    type TEXT NOT NULL,
    count INT DEFAULT 0,
    period TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(corporate_id, type, period)
  )`, 'usage_records table created');

  await run(`CREATE TABLE IF NOT EXISTS plan_limits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type TEXT UNIQUE NOT NULL,
    max_users INT NOT NULL DEFAULT 1,
    max_claims INT NOT NULL DEFAULT 50,
    max_ai_requests INT NOT NULL DEFAULT 100,
    max_documents INT NOT NULL DEFAULT 500,
    overage_per_claim DECIMAL(10,2),
    overage_per_ai_req DECIMAL(10,2),
    overage_per_document DECIMAL(10,2)
  )`, 'plan_limits table created');

  await run(`INSERT INTO plan_limits (id, plan_type, max_users, max_claims, max_ai_requests, max_documents, overage_per_claim, overage_per_ai_req, overage_per_document) VALUES
    (gen_random_uuid(), 'starter', 1, 25, 50, 100, 2.00, 0.10, 0.05),
    (gen_random_uuid(), 'team', 5, 100, 250, 500, 1.50, 0.08, 0.04),
    (gen_random_uuid(), 'pro', 15, 500, 1000, 2500, 1.00, 0.05, 0.03),
    (gen_random_uuid(), 'enterprise', 999, 999999, 999999, 999999, NULL, NULL, NULL)
  ON CONFLICT (plan_type) DO NOTHING`, 'plan_limits seeded');

  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`, 'users.avatar_url added');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`, 'users.email_verified added');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`, 'users.verification_token added');

  if (fixes.length > 0) {
    logger.info({ fixes }, 'Schema sync: applied database fixes on startup');
  }
}

const server = app.listen(env.PORT, () => {
  logger.info(`FreightClaims API v5.0.0 running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info({
    geminiKey: env.GEMINI_API_KEY ? `configured (${env.GEMINI_API_KEY.length} chars)` : 'NOT SET',
    aiModel: env.AI_MODEL,
    smtp: env.SMTP_HOST ? `${env.SMTP_HOST}:${env.SMTP_PORT}` : 'NOT SET',
    storage: env.STORAGE_MODE || 'local',
  }, 'Service configuration');

  ensureSchemaSync().catch(() => {});
});

/** Graceful shutdown -- drain connections before exiting */
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Database disconnected, server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if connections haven't drained
  setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
