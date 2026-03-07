/**
 * EmailService - Email dispatch and notification management
 *
 * Location: apps/api/src/services/email.service.ts
 */
import { emailRepository } from '../repositories/email.repository';
import type { JwtPayload } from '../middleware/auth.middleware';

export const emailService = {
  async send(data: Record<string, unknown>, _user: JwtPayload) { return emailRepository.send(data); },
  async getByClaimId(claimId: string) { return emailRepository.getByClaimId(claimId); },
  async getNotifications(userId: string) { return emailRepository.getNotifications(userId); },
  async getUnreadCount(userId: string) { return emailRepository.getUnreadCount(userId); },
  async markAsRead(id: string) { return emailRepository.markAsRead(id); },
  async markAllAsRead(userId: string) { return emailRepository.markAllAsRead(userId); },
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
