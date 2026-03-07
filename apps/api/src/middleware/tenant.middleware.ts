/**
 * Tenant Isolation Middleware - CorporateId-based multi-tenancy
 *
 * Extracts the corporateId from the JWT token and attaches it to the request.
 * All downstream queries use this to filter data so tenants can never see
 * each other's data. Super-admins (isSuperAdmin=true) can optionally switch
 * tenants via the X-Corporate-Id header.
 *
 * This mirrors the old .NET ICorporateOwned / ForCorporate() pattern.
 *
 * Location: apps/api/src/middleware/tenant.middleware.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface TenantContext {
  corporateId: string | null;
  isSuperAdmin: boolean;
  /** Effective corporateId after impersonation, used for all queries */
  effectiveCorporateId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Attaches tenant context to every authenticated request.
 * Must run AFTER the authenticate middleware so req.user is available.
 */
export function tenantIsolation(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    next();
    return;
  }

  const corporateId: string | null = user.corporateId || null;
  const isSuperAdmin: boolean = user.isSuperAdmin === true;

  // Super-admins can impersonate a tenant via header (like old CargoClaims pattern)
  let effectiveCorporateId = corporateId;
  if (isSuperAdmin) {
    const headerCorp = req.headers['x-corporate-id'] as string | undefined;
    if (headerCorp) {
      effectiveCorporateId = headerCorp;
      logger.debug({ userId: user.userId, impersonating: headerCorp }, 'Super-admin impersonating tenant');
    }
  }

  req.tenant = {
    corporateId,
    isSuperAdmin,
    effectiveCorporateId,
  };

  next();
}

/**
 * Helper to build a Prisma where clause that enforces tenant isolation.
 * Use this in every repository/service query:
 *
 *   prisma.claim.findMany({ where: { ...tenantFilter(req), status: 'pending' } })
 *
 * Super-admins with no X-Corporate-Id header get unfiltered access.
 */
export function tenantFilter(req: Request): Record<string, unknown> {
  const tenant = req.tenant;
  if (!tenant) return {};

  // Super-admin with no impersonation sees everything
  if (tenant.isSuperAdmin && !tenant.effectiveCorporateId) return {};

  // Normal user or impersonating super-admin
  if (tenant.effectiveCorporateId) {
    return { corporateId: tenant.effectiveCorporateId };
  }

  return {};
}

/**
 * Prisma-compatible tenant filter for use inside services that don't have
 * direct access to the Request object. Pass the corporateId explicitly.
 */
export function forCorporate(corporateId: string | null, isSuperAdmin = false): Record<string, unknown> {
  if (isSuperAdmin && !corporateId) return {};
  if (corporateId) return { corporateId };
  return {};
}
