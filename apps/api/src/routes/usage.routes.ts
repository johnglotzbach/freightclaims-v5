import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { usageService } from '../services/usage.service';

export const usageRouter: Router = Router();
usageRouter.use(authenticate);

usageRouter.get('/current', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const corporateId = user.corporateId;
    if (!corporateId) {
      return res.json({ period: '', planType: 'none', usage: {}, limits: null, overages: null });
    }
    const data = await usageService.getUsageWithLimits(corporateId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

usageRouter.get('/history', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const corporateId = user.corporateId;
    if (!corporateId) return res.json([]);

    const months = Number(req.query.months) || 6;
    const now = new Date();
    const periods: string[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const records = await (await import('../config/database')).prisma.usageRecord.findMany({
      where: { corporateId, period: { in: periods } },
      orderBy: { period: 'asc' },
    });
    res.json(records);
  } catch (err) {
    next(err);
  }
});
