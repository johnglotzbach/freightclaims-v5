/**
 * Audit Logging Middleware - Tracks all mutating operations for compliance
 *
 * Logs create, update, and delete actions to the activity_logs table.
 * Used for security auditing, compliance, and user activity tracking.
 * Only logs POST, PUT, PATCH, DELETE requests (not reads).
 *
 * Location: apps/api/src/middleware/audit.middleware.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Extracts the entity type from the request path.
 * /api/v1/claims/123 → "claim"
 * /api/v1/customers → "customer"
 */
function extractEntity(path: string): string {
  const segments = path.replace(/^\/api\/v\d+\//, '').split('/');
  const entity = segments[0] || 'unknown';
  // Singularize basic plurals
  return entity.endsWith('s') ? entity.slice(0, -1) : entity;
}

function extractEntityId(path: string): string | undefined {
  const segments = path.replace(/^\/api\/v\d+\//, '').split('/');
  return segments[1] || undefined;
}

function methodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  // Capture the original end function to log after response is sent
  const originalEnd = res.end;
  const startTime = Date.now();

  res.end = function (...args: any[]) {
    // Only log successful mutations (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const user = (req as any).user;
      const tenant = (req as any).tenant;

      prisma.activityLog.create({
        data: {
          userId: user?.userId || null,
          corporateId: tenant?.effectiveCorporateId || user?.corporateId || null,
          action: methodToAction(req.method),
          entity: extractEntity(req.path),
          entityId: extractEntityId(req.path),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: Date.now() - startTime,
          },
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
        },
      }).catch((err: any) => {
        logger.warn({ err }, 'Failed to write audit log');
      });
    }

    return originalEnd.apply(res, args as any);
  } as any;

  next();
}
