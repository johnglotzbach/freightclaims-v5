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
