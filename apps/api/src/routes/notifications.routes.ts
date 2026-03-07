/**
 * Notifications Routes - SMS, email, and push notification management
 *
 * Provides endpoints for sending SMS via Twilio, checking service status,
 * and managing notification preferences.
 *
 * Location: apps/api/src/routes/notifications.routes.ts
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { smsService } from '../services/sms.service';
import { smtpService } from '../services/smtp.service';
import { convertService } from '../services/convert.service';

export const notificationsRouter: Router = Router();

notificationsRouter.use(authenticate);

/** Service health — which integrations are active */
notificationsRouter.get('/status', (_req, res) => {
  res.json({
    smtp: smtpService.isReady,
    sms: smsService.isConfigured,
    convertApi: convertService.isConfigured,
  });
});

/** Send a one-off SMS (admin only) */
notificationsRouter.post('/sms/send', authorize(['admin']), async (req, res, next) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({ success: false, error: 'to and body are required' });
    }
    const result = await smsService.send({ to, body });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** Broadcast SMS to all admin users */
notificationsRouter.post('/sms/broadcast', authorize(['admin']), async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }
    const results = await smsService.broadcastToAdmins(message);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
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
