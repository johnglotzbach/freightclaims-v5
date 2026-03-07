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
import { newsRouter } from './routes/news.routes';
import { onboardingRouter } from './routes/onboarding.routes';
import { chatbotRouter } from './routes/chatbot.routes';

const app = express();

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
  }),
);

// Gzip response compression
app.use(compression());

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout — abort requests exceeding 30 seconds
app.use((req, res, next) => {
  req.setTimeout(30_000, () => {
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

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------

const v1 = express.Router();

// Tenant isolation runs AFTER authenticate (inside each router),
// so req.user is available when tenantIsolation reads corporateId.
v1.use(tenantIsolation);
v1.use(auditLog);

v1.use('/claims', claimsRouter);
v1.use('/users', usersRouter);
v1.use('/customers', customersRouter);
v1.use('/shipments', shipmentsRouter);
v1.use('/documents', documentsRouter);
v1.use('/email', emailRouter);
v1.use('/search', searchRouter);
v1.use('/reports', reportsRouter);
v1.use('/automation', automationRouter);
v1.use('/ai', aiRouter);
v1.use('/email-submission', emailSubmissionRouter);
v1.use('/contracts', contractsRouter);
v1.use('/news', newsRouter);
v1.use('/onboarding', onboardingRouter);
v1.use('/chatbot', chatbotRouter);

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

const server = app.listen(env.PORT, () => {
  logger.info(`FreightClaims API v5.0.0 running on port ${env.PORT} [${env.NODE_ENV}]`);
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
