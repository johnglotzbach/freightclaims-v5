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
import { workflowsRouter } from './routes/workflows.routes';

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
v1.use('/workflows', workflowsRouter);

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

  // --- Existing columns ---
  await run(`ALTER TABLE claim_documents ALTER COLUMN claim_id DROP NOT NULL`, 'claim_documents.claim_id nullable');
  await run(`ALTER TABLE claim_documents ALTER COLUMN category_id DROP NOT NULL`, 'claim_documents.category_id nullable');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan_type TEXT`, 'customers.plan_type');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 1`, 'customers.max_users');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_email TEXT`, 'customers.billing_email');
  await run(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner_id TEXT`, 'customers.owner_id');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0`, 'users.failed_login_attempts');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`, 'users.locked_until');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT`, 'users.two_factor_secret');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE`, 'users.two_factor_enabled');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`, 'users.avatar_url');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`, 'users.email_verified');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`, 'users.verification_token');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS filing_status TEXT DEFAULT 'unfiled'`, 'claim_parties.filing_status');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS filed_date TIMESTAMP`, 'claim_parties.filed_date');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS acknowledged_date TIMESTAMP`, 'claim_parties.acknowledged_date');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS carrier_claim_number TEXT`, 'claim_parties.carrier_claim_number');
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS carrier_response TEXT`, 'claim_parties.carrier_response');
  await run(`ALTER TABLE claim_documents ADD COLUMN IF NOT EXISTS thumbnail_key TEXT`, 'claim_documents.thumbnail_key');

  // --- Enterprise overhaul: new claim columns ---
  await run(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS reserve_amount DECIMAL(12,2)`, 'claims.reserve_amount');
  await run(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS parent_claim_id TEXT`, 'claims.parent_claim_id');
  await run(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS assigned_to_id TEXT`, 'claims.assigned_to_id');
  await run(`CREATE INDEX IF NOT EXISTS idx_claims_assigned ON claims(assigned_to_id)`, 'claims.assigned_to_id idx');
  await run(`CREATE INDEX IF NOT EXISTS idx_claims_parent ON claims(parent_claim_id)`, 'claims.parent_claim_id idx');

  // --- Enterprise overhaul: ClaimParty new columns ---
  await run(`ALTER TABLE claim_parties ADD COLUMN IF NOT EXISTS contact_name TEXT`, 'claim_parties.contact_name');

  // --- Enterprise overhaul: ClaimProduct new columns ---
  await run(`ALTER TABLE claim_products ADD COLUMN IF NOT EXISTS claim_amount DECIMAL(12,2)`, 'claim_products.claim_amount');
  await run(`ALTER TABLE claim_products ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,2)`, 'claim_products.unit_cost');
  await run(`ALTER TABLE claim_products ADD COLUMN IF NOT EXISTS sku TEXT`, 'claim_products.sku');
  await run(`ALTER TABLE claim_products ADD COLUMN IF NOT EXISTS po_number TEXT`, 'claim_products.po_number');
  await run(`ALTER TABLE claim_products ADD COLUMN IF NOT EXISTS condition TEXT`, 'claim_products.condition');

  // --- Enterprise overhaul: ClaimComment new columns ---
  await run(`ALTER TABLE claim_comments ADD COLUMN IF NOT EXISTS content_html TEXT`, 'claim_comments.content_html');
  await run(`ALTER TABLE claim_comments ADD COLUMN IF NOT EXISTS parent_id TEXT`, 'claim_comments.parent_id');
  await run(`ALTER TABLE claim_comments ADD COLUMN IF NOT EXISTS mentioned_user_ids TEXT`, 'claim_comments.mentioned_user_ids');
  await run(`ALTER TABLE claim_comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE`, 'claim_comments.is_pinned');
  await run(`ALTER TABLE claim_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE`, 'claim_comments.is_internal');
  await run(`ALTER TABLE claim_comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`, 'claim_comments.edited_at');
  await run(`CREATE INDEX IF NOT EXISTS idx_comments_parent ON claim_comments(parent_id)`, 'claim_comments.parent_id idx');

  // --- Enterprise overhaul: ClaimDocument new columns ---
  await run(`ALTER TABLE claim_documents ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`, 'claim_documents.sort_order');

  // --- Enterprise overhaul: ClaimTask new columns ---
  await run(`ALTER TABLE claim_tasks ADD COLUMN IF NOT EXISTS reminder_minutes INT`, 'claim_tasks.reminder_minutes');
  await run(`ALTER TABLE claim_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`, 'claim_tasks.completed_at');
  await run(`ALTER TABLE claim_tasks ADD COLUMN IF NOT EXISTS email_log_id TEXT`, 'claim_tasks.email_log_id');
  await run(`CREATE INDEX IF NOT EXISTS idx_tasks_due ON claim_tasks(due_date)`, 'claim_tasks.due_date idx');

  // --- Enterprise overhaul: ClaimPayment expanded ---
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS claim_party_id TEXT`, 'claim_payments.claim_party_id');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'inbound_payment'`, 'claim_payments.transaction_type');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound'`, 'claim_payments.direction');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'cleared'`, 'claim_payments.payment_status');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS check_number TEXT`, 'claim_payments.check_number');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS gl_code TEXT`, 'claim_payments.gl_code');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS payee_name TEXT`, 'claim_payments.payee_name');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS vendor_name TEXT`, 'claim_payments.vendor_name');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS vendor_phone TEXT`, 'claim_payments.vendor_phone');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS notes TEXT`, 'claim_payments.notes');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'`, 'claim_payments.currency');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS expected_date TIMESTAMP`, 'claim_payments.expected_date');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS created_by_id TEXT`, 'claim_payments.created_by_id');
  await run(`ALTER TABLE claim_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`, 'claim_payments.updated_at');
  await run(`CREATE INDEX IF NOT EXISTS idx_payments_party ON claim_payments(claim_party_id)`, 'claim_payments.party idx');
  await run(`CREATE INDEX IF NOT EXISTS idx_payments_type ON claim_payments(transaction_type)`, 'claim_payments.type idx');

  // --- Enterprise overhaul: EmailLog expanded ---
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS cc TEXT`, 'email_logs.cc');
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bcc TEXT`, 'email_logs.bcc');
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS content_html TEXT`, 'email_logs.content_html');
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS message_id TEXT`, 'email_logs.message_id');
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS in_reply_to TEXT`, 'email_logs.in_reply_to');
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS thread_id TEXT`, 'email_logs.thread_id');
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS attachment_ids JSONB`, 'email_logs.attachment_ids');
  await run(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS open_count INT DEFAULT 0`, 'email_logs.open_count');
  await run(`CREATE INDEX IF NOT EXISTS idx_email_thread ON email_logs(thread_id)`, 'email_logs.thread_id idx');
  await run(`CREATE INDEX IF NOT EXISTS idx_email_msg ON email_logs(message_id)`, 'email_logs.message_id idx');

  // --- Enterprise overhaul: EmailTemplate new columns ---
  await run(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS corporate_id TEXT`, 'email_templates.corporate_id');

  // --- Enterprise overhaul: Notification new columns ---
  await run(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT`, 'notifications.category');

  // --- Enterprise overhaul: ActivityLog expanded ---
  await run(`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS old_values JSONB`, 'activity_logs.old_values');
  await run(`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS new_values JSONB`, 'activity_logs.new_values');

  // --- Enterprise overhaul: Carrier expanded ---
  await run(`ALTER TABLE carriers ADD COLUMN IF NOT EXISTS address TEXT`, 'carriers.address');
  await run(`ALTER TABLE carriers ADD COLUMN IF NOT EXISTS city TEXT`, 'carriers.city');
  await run(`ALTER TABLE carriers ADD COLUMN IF NOT EXISTS state TEXT`, 'carriers.state');
  await run(`ALTER TABLE carriers ADD COLUMN IF NOT EXISTS zip_code TEXT`, 'carriers.zip_code');
  await run(`ALTER TABLE carriers ADD COLUMN IF NOT EXISTS capacity_type TEXT`, 'carriers.capacity_type');

  // --- Enterprise overhaul: CarrierContact expanded ---
  await run(`ALTER TABLE carrier_contacts ADD COLUMN IF NOT EXISTS address TEXT`, 'carrier_contacts.address');
  await run(`ALTER TABLE carrier_contacts ADD COLUMN IF NOT EXISTS city TEXT`, 'carrier_contacts.city');
  await run(`ALTER TABLE carrier_contacts ADD COLUMN IF NOT EXISTS state TEXT`, 'carrier_contacts.state');
  await run(`ALTER TABLE carrier_contacts ADD COLUMN IF NOT EXISTS zip_code TEXT`, 'carrier_contacts.zip_code');

  // --- Enterprise overhaul: NotificationPreference table ---
  await run(`CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    in_app_setting TEXT NOT NULL DEFAULT 'all_claims',
    email_setting TEXT NOT NULL DEFAULT 'all_claims',
    UNIQUE(user_id, event_type)
  )`, 'notification_preferences table');

  // --- Enterprise overhaul: Workflow tables ---
  await run(`CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    corporate_id TEXT,
    trigger TEXT NOT NULL,
    trigger_config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`, 'workflows table');
  await run(`CREATE INDEX IF NOT EXISTS idx_workflows_corp ON workflows(corporate_id)`, 'workflows.corporate_id idx');
  await run(`CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON workflows(trigger)`, 'workflows.trigger idx');

  await run(`CREATE TABLE IF NOT EXISTS workflow_steps (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    action_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    condition_logic JSONB
  )`, 'workflow_steps table');
  await run(`CREATE INDEX IF NOT EXISTS idx_wfsteps_wf ON workflow_steps(workflow_id)`, 'workflow_steps.workflow_id idx');

  await run(`CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    claim_id TEXT,
    current_step INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    log JSONB
  )`, 'workflow_executions table');
  await run(`CREATE INDEX IF NOT EXISTS idx_wfexec_wf ON workflow_executions(workflow_id)`, 'workflow_executions.workflow_id idx');
  await run(`CREATE INDEX IF NOT EXISTS idx_wfexec_status ON workflow_executions(status)`, 'workflow_executions.status idx');
  await run(`CREATE INDEX IF NOT EXISTS idx_wfexec_next ON workflow_executions(next_run_at)`, 'workflow_executions.next_run_at idx');

  // --- Existing tables ---
  await run(`CREATE TABLE IF NOT EXISTS usage_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    corporate_id TEXT NOT NULL,
    type TEXT NOT NULL,
    count INT DEFAULT 0,
    period TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(corporate_id, type, period)
  )`, 'usage_records table');

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
  )`, 'plan_limits table');

  await run(`INSERT INTO plan_limits (id, plan_type, max_users, max_claims, max_ai_requests, max_documents, overage_per_claim, overage_per_ai_req, overage_per_document) VALUES
    (gen_random_uuid(), 'starter', 1, 25, 50, 100, 2.00, 0.10, 0.05),
    (gen_random_uuid(), 'team', 5, 100, 250, 500, 1.50, 0.08, 0.04),
    (gen_random_uuid(), 'pro', 15, 500, 1000, 2500, 1.00, 0.05, 0.03),
    (gen_random_uuid(), 'enterprise', 999, 999999, 999999, 999999, NULL, NULL, NULL)
  ON CONFLICT (plan_type) DO NOTHING`, 'plan_limits seeded');

  await run(`CREATE TABLE IF NOT EXISTS fraud_flags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    evidence JSONB,
    status TEXT NOT NULL DEFAULT 'open',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`, 'fraud_flags table');
  await run(`CREATE INDEX IF NOT EXISTS idx_fraud_flags_claim ON fraud_flags(claim_id)`, 'fraud_flags.claim_id idx');
  await run(`CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON fraud_flags(status)`, 'fraud_flags.status idx');

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
