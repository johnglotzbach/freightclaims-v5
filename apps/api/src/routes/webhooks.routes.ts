import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const webhooksRouter: Router = Router();

webhooksRouter.post('/sendgrid', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const ev of events) {
      if (!ev.sg_message_id || !ev.event) continue;
      await prisma.emailEvent.create({
        data: {
          emailId: ev.sg_message_id.split('.')[0],
          event: ev.event,
          timestamp: ev.timestamp ? new Date(ev.timestamp * 1000) : new Date(),
          metadata: { email: ev.email, reason: ev.reason, ip: ev.ip, useragent: ev.useragent },
        },
      }).catch(() => {});
    }
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, 'SendGrid webhook error');
    res.status(200).json({ received: true });
  }
});
