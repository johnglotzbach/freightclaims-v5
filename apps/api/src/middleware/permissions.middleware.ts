/**
 * Permission Middleware - Granular permission checking for routes
 *
 * Checks that the authenticated user has the required permission(s).
 * Permissions are stored in the JWT token as an array and also loaded
 * from the role's permission set for real-time checks.
 *
 * Mirrors the old .NET CustomAuthorize attribute:
 *   [CustomAuthorize("manage-customers")] → requirePermission('customers.manage')
 *
 * Location: apps/api/src/middleware/permissions.middleware.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { cacheGet, cacheSet } from '../utils/cache';

/**
 * Middleware factory that requires the user to have a specific permission.
 * Can require view-only or edit access.
 *
 * Usage:
 *   router.get('/claims', requirePermission('claims.view'), controller.list)
 *   router.post('/claims', requirePermission('claims.edit'), controller.create)
 */
export function requirePermission(permissionName: string, level: 'view' | 'edit' = 'view') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Super-admins bypass permission checks
    if (user.isSuperAdmin) {
      next();
      return;
    }

    // Check if user's role has the required permission
    const roleId = user.roleId;
    if (!roleId) {
      res.status(403).json({ success: false, message: 'No role assigned' });
      return;
    }

    const hasPermission = await checkRolePermission(roleId, permissionName, level);
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Insufficient permissions: requires ${permissionName} (${level})`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory that requires ANY of the listed permissions.
 */
export function requireAnyPermission(permissions: string[], level: 'view' | 'edit' = 'view') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (user.isSuperAdmin) {
      next();
      return;
    }

    const roleId = user.roleId;
    if (!roleId) {
      res.status(403).json({ success: false, message: 'No role assigned' });
      return;
    }

    for (const perm of permissions) {
      if (await checkRolePermission(roleId, perm, level)) {
        next();
        return;
      }
    }

    res.status(403).json({
      success: false,
      message: `Insufficient permissions: requires one of [${permissions.join(', ')}]`,
    });
  };
}

/**
 * Checks if a role has a specific permission at the required level.
 * Caches role permissions for 5 minutes to avoid constant DB hits.
 */
async function checkRolePermission(
  roleId: string,
  permissionName: string,
  level: 'view' | 'edit',
): Promise<boolean> {
  const cacheKey = `role-perms:${roleId}`;
  let permissions = await cacheGet<Record<string, { isView: boolean; isEdit: boolean }>>(cacheKey);

  if (!permissions) {
    const rolePerms = await prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: { select: { name: true } } },
    });

    permissions = {};
    for (const rp of rolePerms) {
      permissions[rp.permission.name] = { isView: rp.isView, isEdit: rp.isEdit };
    }

    // Also check if role has allPermissions flag
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { allPermissions: true },
    });
    if (role?.allPermissions) {
      permissions['__all__'] = { isView: true, isEdit: true };
    }

    await cacheSet(cacheKey, permissions, 300);
  }

  // allPermissions flag grants everything
  if (permissions['__all__']) return true;

  const perm = permissions[permissionName];
  if (!perm) return false;

  return level === 'view' ? perm.isView : perm.isEdit;
}

/**
 * Returns all permission names for a given role (used when generating JWTs).
 */
export async function getPermissionsForRole(roleId: string): Promise<string[]> {
  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: { select: { name: true } } },
  });
  return rolePerms.map((rp: any) => rp.permission.name);
}
