import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env';

export const adminRouter: Router = Router();

adminRouter.use(authenticate);

adminRouter.get('/platform-stats', authorize(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(req as any).user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Super admin required' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalWorkspaces,
      activeWorkspaces,
      totalUsers,
      activeUsers,
      totalClaims,
      claimAggregates,
      claimsThisMonth,
      claimsLastMonth,
      newUsersThisMonth,
      newUsersLastMonth,
      newWorkspacesThisMonth,
    ] = await Promise.all([
      prisma.customer.count({ where: { isCorporate: true, deletedAt: null } }),
      prisma.customer.count({ where: { isCorporate: true, isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.claim.count({ where: { deletedAt: null } }),
      prisma.claim.aggregate({
        where: { deletedAt: null },
        _sum: { claimAmount: true, settledAmount: true },
      }),
      prisma.claim.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
      prisma.claim.count({ where: { deletedAt: null, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.customer.count({ where: { isCorporate: true, deletedAt: null, createdAt: { gte: startOfMonth } } }),
    ]);

    const totalClaimValue = Number(claimAggregates._sum?.claimAmount ?? 0);
    const totalSettledValue = Number(claimAggregates._sum?.settledAmount ?? 0);

    const claimsGrowth = claimsLastMonth > 0
      ? Math.round(((claimsThisMonth - claimsLastMonth) / claimsLastMonth) * 100)
      : claimsThisMonth > 0 ? 100 : 0;

    const usersGrowth = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : newUsersThisMonth > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        workspaces: { total: totalWorkspaces, active: activeWorkspaces, newThisMonth: newWorkspacesThisMonth },
        users: { total: totalUsers, active: activeUsers, newThisMonth: newUsersThisMonth, growth: usersGrowth },
        claims: { total: totalClaims, thisMonth: claimsThisMonth, growth: claimsGrowth },
        revenue: { totalClaimValue, totalSettledValue, collectionRate: totalClaimValue > 0 ? Math.round((totalSettledValue / totalClaimValue) * 100) : 0 },
      },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/workspace-stats/:workspaceId', authorize(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(req as any).user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Super admin required' });
    }
    const workspaceId = req.params.workspaceId as string;

    const [workspace, userCount, claimStats, recentClaims] = await Promise.all([
      prisma.customer.findUnique({ where: { id: workspaceId } }),
      prisma.user.count({ where: { corporateId: workspaceId, deletedAt: null } }),
      prisma.claim.aggregate({
        where: { customerId: workspaceId, deletedAt: null } as any,
        _count: true,
        _sum: { claimAmount: true, settledAmount: true },
      }),
      prisma.claim.findMany({
        where: { customerId: workspaceId, deletedAt: null } as any,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, claimNumber: true, status: true, claimAmount: true, createdAt: true },
      }),
    ]);

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    res.json({
      success: true,
      data: {
        workspace,
        stats: {
          users: userCount,
          totalClaims: (claimStats._count as any) ?? 0,
          totalClaimValue: Number(claimStats._sum?.claimAmount ?? 0),
          totalSettledValue: Number(claimStats._sum?.settledAmount ?? 0),
        },
        recentClaims,
      },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/user-stats/:userId', authorize(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(req as any).user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Super admin required' });
    }
    const userId = req.params.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { name: true } },
        corporate: { select: { id: true, name: true, code: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const claimStats = await prisma.claim.aggregate({
      where: { createdById: userId, deletedAt: null } as any,
      _count: true,
      _sum: { claimAmount: true, settledAmount: true },
    });

    const { passwordHash: _pw, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        user: safeUser,
        stats: {
          totalClaims: (claimStats._count as any) ?? 0,
          totalClaimValue: Number(claimStats._sum?.claimAmount ?? 0),
          totalSettledValue: Number(claimStats._sum?.settledAmount ?? 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Storage analytics: disk usage broken down by tenant/workspace.
 * Only available to super admins.
 */
adminRouter.get('/storage-stats', authorize(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(req as any).user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Super admin required' });
    }

    const uploadDir = path.resolve(env.LOCAL_UPLOAD_DIR);

    async function dirSize(dir: string): Promise<number> {
      let total = 0;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            total += await dirSize(full);
          } else if (!entry.name.endsWith('.meta.json')) {
            const stat = await fs.stat(full);
            total += stat.size;
          }
        }
      } catch { /* dir doesn't exist yet */ }
      return total;
    }

    async function fileCount(dir: string): Promise<number> {
      let count = 0;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += await fileCount(path.join(dir, entry.name));
          } else if (!entry.name.endsWith('.meta.json')) {
            count++;
          }
        }
      } catch { /* dir doesn't exist yet */ }
      return count;
    }

    const totalBytes = await dirSize(uploadDir);
    const totalFiles = await fileCount(uploadDir);

    const tenantDir = path.join(uploadDir, 'tenant');
    const byWorkspace: Array<{ workspaceId: string; workspaceName: string; bytes: number; files: number }> = [];

    try {
      const tenants = await fs.readdir(tenantDir, { withFileTypes: true });
      for (const t of tenants) {
        if (t.isDirectory()) {
          const tPath = path.join(tenantDir, t.name);
          const bytes = await dirSize(tPath);
          const files = await fileCount(tPath);
          let workspaceName = t.name;
          if (t.name !== '_global') {
            const ws = await prisma.customer.findUnique({ where: { id: t.name }, select: { name: true } });
            workspaceName = ws?.name || t.name;
          }
          byWorkspace.push({ workspaceId: t.name, workspaceName, bytes, files });
        }
      }
    } catch { /* tenant dir doesn't exist yet */ }

    const dbDocStats = await prisma.claimDocument.aggregate({ _count: true, _sum: { fileSize: true } });

    res.json({
      success: true,
      data: {
        disk: {
          totalBytes,
          totalFiles,
          totalMB: Math.round(totalBytes / 1024 / 1024 * 100) / 100,
          diskCapacityGB: 10,
          usedPercent: Math.round((totalBytes / (10 * 1024 * 1024 * 1024)) * 10000) / 100,
        },
        database: {
          totalDocuments: (dbDocStats._count as any) ?? 0,
          totalTrackedBytes: Number(dbDocStats._sum?.fileSize ?? 0),
        },
        byWorkspace: byWorkspace.sort((a, b) => b.bytes - a.bytes),
      },
    });
  } catch (err) {
    next(err);
  }
});
