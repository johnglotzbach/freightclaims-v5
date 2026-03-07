/**
 * Global Error Handler - Catches all unhandled errors in route handlers
 *
 * Converts thrown errors into consistent JSON responses. In production, stack
 * traces and internal details are stripped to prevent information leakage.
 * All errors are logged with full context for debugging.
 *
 * Location: apps/api/src/middleware/error-handler.middleware.ts
 * Related: apps/api/src/utils/errors.ts (custom error classes)
 */
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

/**
 * Express error-handling middleware (4-param signature is required by Express).
 * Must be registered LAST in the middleware chain.
 *
 * @param err - The thrown error
 * @param req - Express request
 * @param res - Express response
 * @param _next - Next function (unused but required for Express error handler signature)
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Custom AppError instances carry their own status code and safe message
  if (err instanceof AppError) {
    logger.warn(
      { err, path: req.path, method: req.method },
      `Handled error: ${err.message}`,
    );

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Prisma-specific errors — unique constraint, not found, connection
  const prismaCode = (err as any).code;
  if (typeof prismaCode === 'string' && prismaCode.startsWith('P')) {
    const prismaErrors: Record<string, { status: number; message: string }> = {
      P2002: { status: 409, message: 'A record with that value already exists' },
      P2025: { status: 404, message: 'Record not found' },
      P2003: { status: 400, message: 'Invalid reference — related record does not exist' },
      P2014: { status: 400, message: 'This operation violates a required relation' },
    };

    const mapped = prismaErrors[prismaCode];
    if (mapped) {
      logger.warn({ code: prismaCode, path: req.path, method: req.method }, `Prisma error: ${mapped.message}`);
      res.status(mapped.status).json({ success: false, error: mapped.message, code: prismaCode });
      return;
    }
  }

  // Zod validation errors (in case they bubble past the validate middleware)
  if (err.name === 'ZodError') {
    if (env.NODE_ENV === 'production') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        fields: (err as any).issues.map((i: { path: string[] }) => i.path.join('.')),
      });
    } else {
      res.status(400).json({ success: false, error: 'Validation failed', details: (err as any).issues });
    }
    return;
  }

  // Request timeout
  if ((req as any).timedout) {
    res.status(408).json({ success: false, error: 'Request timed out' });
    return;
  }

  // Unexpected errors — never leak internals in production
  const SENSITIVE_KEYS = ['password', 'currentPassword', 'newPassword', 'token', 'resetToken', 'refreshToken', 'apiKey', 'secret', 'ssn', 'creditCard'];
  const sanitizedBody = req.body && typeof req.body === 'object'
    ? Object.fromEntries(Object.entries(req.body).map(([k, v]) => [k, SENSITIVE_KEYS.includes(k) ? '[REDACTED]' : v]))
    : req.body;

  logger.error(
    { err, path: req.path, method: req.method, body: sanitizedBody },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
