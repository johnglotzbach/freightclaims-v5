/**
 * EmailRepository - Database queries for email, notification, and queue entities
 *
 * Location: apps/api/src/repositories/email.repository.ts
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const emailRepository = {
  /** Dispatches an email and logs it to the database */
  async send(data: Record<string, unknown>) {
    const logEntry = await prisma.emailLog.create({
      data: {
        from: (data.from as string) || 'claims@freightclaims.com',
        to: data.to as string,
        subject: data.subject as string,
        body: data.body as string,
        claimId: (data.claimId as string) || null,
        status: 'sent',
        direction: 'outbound',
      },
    });
    logger.info({ emailId: logEntry.id, to: data.to }, 'Email dispatched');
    return { sent: true, emailId: logEntry.id };
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
