/**
 * Audit Logging Middleware - Tracks all mutating operations for compliance
 *
 * Logs create, update, and delete actions to the activity_logs table.
 * Captures oldValues/newValues for PUT/PATCH requests on claims.
 * Used for security auditing, compliance, and user activity tracking.
 * Only logs POST, PUT, PATCH, DELETE requests (not reads).
 *
 * Location: apps/api/src/middleware/audit.middleware.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CLAIM_PATH_RE = /^\/api\/v\d+\/claims\/([a-zA-Z0-9_-]+)$/;

function extractEntity(path: string): string {
  const segments = path.replace(/^\/api\/v\d+\//, '').split('/');
  const entity = segments[0] || 'unknown';
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

async function fetchOldClaimValues(claimId: string): Promise<Record<string, unknown> | null> {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: {
        status: true,
        claimType: true,
        claimAmount: true,
        reserveAmount: true,
        description: true,
        proNumber: true,
        shipDate: true,
        deliveryDate: true,
        filingDate: true,
        acknowledgmentDate: true,
        parentClaimId: true,
        assignedToId: true,
        customerId: true,
      },
    });
    return claim as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const isUpdate = req.method.toUpperCase() === 'PUT' || req.method.toUpperCase() === 'PATCH';
  const claimMatch = req.path.match(CLAIM_PATH_RE);
  const shouldCaptureOld = isUpdate && claimMatch;

  let oldValuesPromise: Promise<Record<string, unknown> | null> = Promise.resolve(null);
  if (shouldCaptureOld) {
    oldValuesPromise = fetchOldClaimValues(claimMatch[1]);
  }

  const originalEnd = res.end;
  const startTime = Date.now();

  res.end = function (...args: any[]) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const user = (req as any).user;
      const tenant = (req as any).tenant;

      const newValues = isUpdate && req.body ? sanitizeBody(req.body) : undefined;

      oldValuesPromise.then((oldValues) => {
        const metadata: Record<string, unknown> = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Date.now() - startTime,
        };

        if (oldValues) metadata.oldValues = oldValues;
        if (newValues) metadata.newValues = newValues;

        prisma.activityLog.create({
          data: {
            userId: user?.userId || null,
            corporateId: tenant?.effectiveCorporateId || user?.corporateId || null,
            action: methodToAction(req.method),
            entity: extractEntity(req.path),
            entityId: extractEntityId(req.path),
            metadata,
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null,
          },
        }).catch((err: any) => {
          logger.warn({ err }, 'Failed to write audit log');
        });
      }).catch((err) => {
        logger.warn({ err }, 'Failed to capture old values for audit log');
      });
    }

    return originalEnd.apply(res, args as any);
  } as any;

  next();
}

const SENSITIVE_KEYS = new Set(['password', 'token', 'secret', 'refreshToken', 'accessToken']);

function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
