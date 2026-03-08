import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

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
