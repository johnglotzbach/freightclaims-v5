/**
 * EmailRepository - Database queries for email, notification, and queue entities
 *
 * Sends email via SMTP (SendGrid / any provider) and logs every dispatch
 * to the database for audit. Falls back to log-only when SMTP is not configured.
 *
 * Location: apps/api/src/repositories/email.repository.ts
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { smtpService } from '../services/smtp.service';

export const emailRepository = {
  /** Sends an email via SMTP and logs it to the database */
  async send(data: Record<string, unknown>) {
    const from = (data.from as string) || 'claims@freightclaims.com';
    const to = data.to as string;
    const subject = data.subject as string;
    const body = data.body as string;

    let status = 'pending';
    let messageId: string | null = null;

    try {
      const result = await smtpService.sendEmail({
        to,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, ''),
        from,
      });
      messageId = result.messageId;
      status = 'sent';
    } catch (err) {
      logger.error({ err, to, subject }, 'Failed to send email via SMTP');
      status = 'failed';
    }

    const logEntry = await prisma.emailLog.create({
      data: {
        from,
        to,
        subject,
        body,
        claimId: (data.claimId as string) || null,
        status,
        direction: 'outbound',
      },
    });

    logger.info({ emailId: logEntry.id, to, status, messageId }, 'Email dispatched');
    return { sent: status === 'sent', emailId: logEntry.id, messageId };
  },

  async getByClaimId(claimId: string) {
    return prisma.emailLog.findMany({ where: { claimId }, orderBy: { createdAt: 'desc' } });
  },

  async getNotifications(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  },

  async getUnreadCount(userId: string) {
    return { count: await prisma.notification.count({ where: { userId, readAt: null } }) };
  },

  async markAsRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  },

  async getPreferences(userId: string) {
    return prisma.userPreference.findUnique({ where: { userId } });
  },

  async updatePreferences(userId: string, data: Record<string, unknown>) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: data as any,
      create: { userId, ...data } as any,
    });
  },

  /** Fetches pending emails from the queue */
  async getPendingEmails(limit: number) {
    return prisma.emailQueue.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },

  /** Marks a queued email as successfully sent */
  async markProcessed(id: string) {
    return prisma.emailQueue.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });
  },

  /** Marks a queued email as failed with error details */
  async markFailed(id: string, error: string) {
    return prisma.emailQueue.update({
      where: { id },
      data: { status: 'failed', error, attempts: { increment: 1 } },
    });
  },
};
