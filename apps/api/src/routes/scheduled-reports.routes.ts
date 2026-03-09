/**
 * Scheduled Reports Routes - CRUD for automated report delivery
 *
 * Allows users to create, list, update, and delete scheduled reports
 * that are automatically generated and emailed on a recurring basis.
 *
 * Location: apps/api/src/routes/scheduled-reports.routes.ts
 */
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth.middleware';
import type { JwtPayload } from '../middleware/auth.middleware';
import type { Request } from 'express';

export const scheduledReportsRouter: Router = Router();

scheduledReportsRouter.use(authenticate);

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

function computeNextRun(schedule: string, from: Date = new Date()): Date {
  const next = new Date(from);
  next.setHours(8, 0, 0, 0);

  switch (schedule) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 - next.getDay() + 1) % 7 || 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1, 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

scheduledReportsRouter.get('/', async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const corporateId = tenant?.effectiveCorporateId;

    const where: Record<string, unknown> = {};
    if (corporateId) where.corporateId = corporateId;

    const reports = await prisma.scheduledReport.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
});

scheduledReportsRouter.post('/', async (req, res, next) => {
  try {
    const user = getUser(req);
    const tenant = req.tenant;
    const corporateId = tenant?.effectiveCorporateId || user.corporateId || user.userId;
    const { name, reportType, filters, schedule, recipients, isActive } = req.body;

    if (!name || !reportType || !schedule || !recipients?.length) {
      return res.status(400).json({ success: false, error: 'name, reportType, schedule, and recipients are required' });
    }

    const report = await prisma.scheduledReport.create({
      data: {
        corporateId,
        createdBy: user.userId,
        name,
        reportType,
        filters: filters || {},
        schedule,
        recipients,
        isActive: isActive ?? true,
        nextRunAt: computeNextRun(schedule),
      },
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

scheduledReportsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Scheduled report not found' });

    const { name, reportType, filters, schedule, recipients, isActive } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (reportType !== undefined) updateData.reportType = reportType;
    if (filters !== undefined) updateData.filters = filters;
    if (schedule !== undefined) {
      updateData.schedule = schedule;
      updateData.nextRunAt = computeNextRun(schedule);
    }
    if (recipients !== undefined) updateData.recipients = recipients;
    if (isActive !== undefined) updateData.isActive = isActive;

    const report = await prisma.scheduledReport.update({
      where: { id },
      data: updateData as any,
    });

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

scheduledReportsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Scheduled report not found' });

    await prisma.scheduledReport.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { next(err); }
});
