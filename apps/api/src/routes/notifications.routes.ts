/**
 * Notifications Routes - Email and integration status management
 *
 * Provides endpoints for checking service status and sending test emails.
 *
 * Location: apps/api/src/routes/notifications.routes.ts
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { smtpService } from '../services/smtp.service';
import { convertService } from '../services/convert.service';
import { prisma } from '../config/database';
import type { JwtPayload } from '../middleware/auth.middleware';

export const notificationsRouter: Router = Router();

notificationsRouter.use(authenticate);

/** Service health — which integrations are active */
notificationsRouter.get('/status', (_req, res) => {
  res.json({
    smtp: smtpService.isReady,
    convertApi: convertService.isConfigured,
  });
});

/** Send a test email (admin only) */
notificationsRouter.post('/email/test', authorize(['admin']), async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'to is required' });
    }
    const result = await smtpService.sendEmail({
      to,
      subject: 'FreightClaims Test Email',
      html: '<h2>Email is working!</h2><p>Your FreightClaims SMTP configuration is correct.</p>',
      text: 'Email is working! Your FreightClaims SMTP configuration is correct.',
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

const VALID_EVENT_TYPES = [
  'claim_created', 'claim_assigned', 'claim_status_change',
  'task_assigned', 'task_completed', 'comment_mention',
  'email_received', 'document_upload', 'filing_party_stagnant', 'filing_party_status',
] as const;

const VALID_SETTINGS = ['none', 'my_claims', 'all_claims'] as const;

/** GET /notifications/preferences - Get user's notification preferences */
notificationsRouter.get('/preferences', async (req, res, next) => {
  try {
    const user = (req as any).user as JwtPayload;
    const prefs = await prisma.notificationPreference.findMany({ where: { userId: user.userId } });
    const prefMap: Record<string, { inAppSetting: string; emailSetting: string }> = {};
    for (const p of prefs) {
      prefMap[(p as any).eventType] = {
        inAppSetting: (p as any).inAppSetting || 'all_claims',
        emailSetting: (p as any).emailSetting || 'all_claims',
      };
    }
    for (const evt of VALID_EVENT_TYPES) {
      if (!prefMap[evt]) {
        prefMap[evt] = { inAppSetting: 'all_claims', emailSetting: 'all_claims' };
      }
    }
    res.json(prefMap);
  } catch (err) { next(err); }
});

/** POST /notifications/preferences - Update notification preferences */
notificationsRouter.post('/preferences', async (req, res, next) => {
  try {
    const user = (req as any).user as JwtPayload;
    const preferences = req.body as Array<{ eventType: string; inAppSetting: string; emailSetting: string }>;
    if (!Array.isArray(preferences)) {
      return res.status(400).json({ success: false, error: 'Body must be an array of preference objects' });
    }
    const results = [];
    for (const pref of preferences) {
      if (!VALID_EVENT_TYPES.includes(pref.eventType as any)) continue;
      const inAppSetting = VALID_SETTINGS.includes(pref.inAppSetting as any) ? pref.inAppSetting : 'all_claims';
      const emailSetting = VALID_SETTINGS.includes(pref.emailSetting as any) ? pref.emailSetting : 'all_claims';
      const result = await (prisma.notificationPreference as any).upsert({
        where: { userId_eventType: { userId: user.userId, eventType: pref.eventType } },
        update: { inAppSetting, emailSetting },
        create: { userId: user.userId, eventType: pref.eventType, inAppSetting, emailSetting },
      });
      results.push(result);
    }
    res.json({ success: true, updated: results.length });
  } catch (err) { next(err); }
});

/** GET /notifications - List notifications for current user */
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as any).user as JwtPayload;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const notifications = await prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(notifications);
  } catch (err) { next(err); }
});

/** PUT /notifications/read-all - Mark all notifications as read */
notificationsRouter.put('/read-all', async (req, res, next) => {
  try {
    const user = (req as any).user as JwtPayload;
    await prisma.notification.updateMany({
      where: { userId: user.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** PUT /notifications/:id/read - Mark a single notification as read */
notificationsRouter.put('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** DELETE /notifications/:id - Delete a notification */
notificationsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
