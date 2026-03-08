/**
 * Authentication Middleware - JWT verification with tenant and permission context
 *
 * Extracts the Bearer token from the Authorization header, verifies it against
 * the JWT_SECRET, and attaches the decoded user payload (including corporateId,
 * roleId, and permissions) to req.user. This is the first layer of the security
 * stack: auth → tenant isolation → permission check.
 *
 * Location: apps/api/src/middleware/auth.middleware.ts
 */
import type { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/** JWT payload signed into every token */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  roleId: string | null;
  corporateId: string | null;
  customerId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
}

/**
 * Non-blocking JWT extraction. Decodes the token and sets req.user if valid,
 * but never rejects the request — unauthenticated requests pass through so
 * downstream middleware (tenantIsolation, auditLog) can still read the user
 * context when it exists. Per-route `authenticate` still enforces auth.
 */
export function softAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      (req as any).user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      // Invalid/expired token — leave req.user unset; authenticate() will reject later
    }
  }
  next();
}

/**
 * Verifies JWT from Authorization header and injects user data into the request.
 * Returns 401 if the token is missing, expired, or invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch (err) {
    logger.warn({ err }, 'JWT verification failed');
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Generates a JWT token for a user. Called during login/registration.
 * Includes corporateId, roleId, and permission names for stateless checks.
 */
export function generateToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
    issuer: 'freightclaims.com',
    audience: 'freightclaims-api',
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Generates a refresh token with a longer expiry.
 */
export function generateRefreshToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any,
    issuer: 'freightclaims.com',
  };
  return jwt.sign({ userId, type: 'refresh' }, env.JWT_SECRET, options);
}

/**
 * Role-based authorization middleware. Restricts access to users whose
 * role name (lowercase) appears in the allowedRoles list.
 * Super admins bypass role checks entirely.
 */
export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (user.isSuperAdmin) {
      next();
      return;
    }

    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    const userRole = (user.role || '').toLowerCase();
    const userPermissions = (user.permissions || []).map((p) => p.toLowerCase());

    const hasRole = normalizedAllowed.includes(userRole);
    const hasPermission = normalizedAllowed.some(
      (role) => userPermissions.includes(role)
        || userPermissions.includes(`${role}.manage`)
        || userPermissions.some((p) => p.startsWith(`${role}.`)),
    );

    if (!hasRole && !hasPermission) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
