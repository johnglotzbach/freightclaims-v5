/**
 * Read-Only Middleware - Blocks write operations when DB_MODE=readonly
 *
 * Used for dev servers that connect to a production database.
 * Prevents accidental mutations while still allowing full read access.
 */
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function readonlyGuard(req: Request, res: Response, next: NextFunction) {
  if (env.DB_MODE === 'readonly' && WRITE_METHODS.has(req.method)) {
    // Allow certain safe POST endpoints (login, search, etc.)
    const safeRoutes = ['/api/v1/users/login', '/api/v1/users/refresh-token', '/api/v1/search'];
    if (safeRoutes.some((r) => req.path.startsWith(r))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Database is in read-only mode. Write operations are disabled on this dev server.',
      hint: 'Set DB_MODE=readwrite in your .env to enable writes.',
    });
  }
  next();
}
