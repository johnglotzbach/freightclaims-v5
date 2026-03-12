import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

export const dashboardsRouter: Router = Router();
dashboardsRouter.use(authenticate);

// GET /dashboards - list user's saved dashboards
dashboardsRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const dashboards = await prisma.savedDashboard.findMany({
      where: { OR: [{ userId: user.userId }, { corporateId: user.corporateId, isCompanyDefault: true }] },
      orderBy: { createdAt: 'desc' },
    });
    res.json(dashboards);
  } catch (err) { next(err); }
});

// POST /dashboards - create
dashboardsRouter.post('/', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { name, filters, isDefault, isCompanyDefault } = req.body;
    const dashboard = await prisma.savedDashboard.create({
      data: { userId: user.userId, corporateId: user.corporateId, name, filters: filters || {}, isDefault: isDefault || false, isCompanyDefault: isCompanyDefault || false },
    });
    res.status(201).json(dashboard);
  } catch (err) { next(err); }
});

// PUT /dashboards/:id - update
dashboardsRouter.put('/:id', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const existing = await prisma.savedDashboard.findFirst({ where: { id: req.params.id, userId: user.userId } });
    if (!existing) return res.status(404).json({ error: 'Dashboard not found' });
    const updated = await prisma.savedDashboard.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /dashboards/:id - delete
dashboardsRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const existing = await prisma.savedDashboard.findFirst({ where: { id: req.params.id, userId: user.userId } });
    if (!existing) return res.status(404).json({ error: 'Dashboard not found' });
    await prisma.savedDashboard.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
