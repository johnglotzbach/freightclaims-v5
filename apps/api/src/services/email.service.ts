/**
 * EmailService - Email dispatch and notification management
 *
 * Location: apps/api/src/services/email.service.ts
 */
import { emailRepository } from '../repositories/email.repository';
import type { JwtPayload } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';

export const emailService = {
  async send(data: Record<string, unknown>, _user: JwtPayload) { return emailRepository.send(data); },

  async getByClaimId(claimId: string, user: JwtPayload) {
    const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: { corporateId: true } });
    if (!claim) throw new NotFoundError(`Claim ${claimId} not found`);
    if (!user.isSuperAdmin && claim.corporateId && claim.corporateId !== user.corporateId) {
      throw new NotFoundError(`Claim ${claimId} not found`);
    }
    return emailRepository.getByClaimId(claimId);
  },

  async getNotifications(user: JwtPayload) {
    return emailRepository.getNotifications(user.userId);
  },

  async getUnreadCount(user: JwtPayload) {
    return emailRepository.getUnreadCount(user.userId);
  },

  async markAsRead(id: string, user: JwtPayload) {
    const notification = await prisma.notification.findUnique({ where: { id }, select: { userId: true } });
    if (!notification) throw new NotFoundError(`Notification ${id} not found`);
    if (notification.userId !== user.userId) {
      throw new NotFoundError(`Notification ${id} not found`);
    }
    return emailRepository.markAsRead(id);
  },

  async markAllAsRead(user: JwtPayload) {
    return emailRepository.markAllAsRead(user.userId);
  },

  async getPreferences(userId: string) { return emailRepository.getPreferences(userId); },
  async updatePreferences(userId: string, data: Record<string, unknown>) { return emailRepository.updatePreferences(userId, data); },

  /** Polls the SQS email queue and processes pending email jobs */
  async processQueue() {
    const pending = await emailRepository.getPendingEmails(50);
    let processed = 0;

    for (const email of pending) {
      try {
        await emailRepository.send(email);
        await emailRepository.markProcessed(email.id);
        processed++;
      } catch (err) {
        await emailRepository.markFailed(email.id, String(err));
      }
    }

    return { processed, total: pending.length };
  },
};
