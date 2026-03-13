import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
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

/**
 * POST /admin/storage-cleanup
 * Finds and removes orphaned files (on disk but no DB record) and
 * orphaned DB records (in DB but file missing from disk). Also cleans
 * stale .meta.json files whose parent file no longer exists.
 * Dry-run by default — pass { "execute": true } to actually delete.
 */
adminRouter.post('/storage-cleanup', authorize(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(req as any).user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Super admin required' });
    }

    const execute = req.body.execute === true;
    const baseDir = path.resolve(env.LOCAL_UPLOAD_DIR);

    async function collectFiles(dir: string, prefix = ''): Promise<string[]> {
      const keys: string[] = [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            keys.push(...await collectFiles(path.join(dir, entry.name), relPath));
          } else {
            keys.push(relPath);
          }
        }
      } catch {}
      return keys;
    }

    const allDiskFiles = await collectFiles(baseDir);

    const dataFiles = allDiskFiles.filter(f => !f.endsWith('.meta.json'));
    const metaFiles = allDiskFiles.filter(f => f.endsWith('.meta.json'));

    const dbDocs = await prisma.claimDocument.findMany({ select: { id: true, s3Key: true } });
    const dbKeys = new Set(dbDocs.map(d => d.s3Key));

    const orphanedDiskFiles: string[] = [];
    for (const diskKey of dataFiles) {
      if (!dbKeys.has(diskKey)) {
        orphanedDiskFiles.push(diskKey);
      }
    }

    const orphanedDbRecords: string[] = [];
    for (const doc of dbDocs) {
      if (!doc.s3Key) continue;
      const filePath = path.join(baseDir, ...doc.s3Key.split('/'));
      try {
        await fs.access(filePath);
      } catch {
        orphanedDbRecords.push(doc.id);
      }
    }

    const staleMetaFiles: string[] = [];
    for (const meta of metaFiles) {
      const parentFile = meta.replace('.meta.json', '');
      if (!dataFiles.includes(parentFile)) {
        staleMetaFiles.push(meta);
      }
    }

    let removedFiles = 0;
    let removedDbRecords = 0;
    let removedMeta = 0;

    if (execute) {
      for (const key of orphanedDiskFiles) {
        try {
          await fs.unlink(path.join(baseDir, ...key.split('/')));
          removedFiles++;
        } catch (err) {
          logger.warn({ err, key }, 'Failed to remove orphaned file');
        }
      }

      for (const meta of staleMetaFiles) {
        try {
          await fs.unlink(path.join(baseDir, ...meta.split('/')));
          removedMeta++;
        } catch (err) {
          logger.warn({ err, meta }, 'Failed to remove stale meta file');
        }
      }

      if (orphanedDbRecords.length > 0) {
        const result = await prisma.claimDocument.deleteMany({
          where: { id: { in: orphanedDbRecords } },
        });
        removedDbRecords = result.count;
      }

      async function pruneEmpty(dir: string): Promise<boolean> {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          let allEmpty = true;
          for (const e of entries) {
            if (e.isDirectory()) {
              const childEmpty = await pruneEmpty(path.join(dir, e.name));
              if (!childEmpty) allEmpty = false;
            } else {
              allEmpty = false;
            }
          }
          if (allEmpty && dir !== baseDir) {
            await fs.rmdir(dir);
          }
          return allEmpty;
        } catch { return true; }
      }
      await pruneEmpty(baseDir);
    }

    res.json({
      success: true,
      dryRun: !execute,
      orphanedDiskFiles: orphanedDiskFiles.length,
      orphanedDbRecords: orphanedDbRecords.length,
      staleMetaFiles: staleMetaFiles.length,
      ...(execute ? { removedFiles, removedDbRecords, removedMeta } : {}),
      details: {
        diskFilesWithoutDb: orphanedDiskFiles.slice(0, 50),
        dbRecordsWithoutFile: orphanedDbRecords.slice(0, 50),
        staleMeta: staleMetaFiles.slice(0, 50),
      },
    });
  } catch (err) {
    next(err);
  }
});
