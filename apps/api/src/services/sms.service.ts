/**
 * SMS Service - Twilio integration for SMS notifications
 *
 * Sends SMS messages for critical claim events: deadline alerts,
 * status changes, payment notifications, and carrier responses.
 * Falls back to logging when Twilio credentials are not configured.
 *
 * Location: apps/api/src/services/sms.service.ts
 */
import Twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

const isConfigured = Boolean(
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER
);

const client = isConfigured
  ? Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

if (isConfigured) {
  logger.info({ from: env.TWILIO_PHONE_NUMBER }, 'Twilio SMS configured and ready');
} else {
  logger.warn('Twilio not configured — SMS will be logged but not delivered');
}

interface SmsPayload {
  to: string;
  body: string;
}

export const smsService = {
  get isConfigured() {
    return isConfigured;
  },

  /**
   * Send an SMS message via Twilio.
   * Logs the message even if delivery fails.
   */
  async send(payload: SmsPayload): Promise<{ sid: string; status: string }> {
    if (!client) {
      logger.info({ to: payload.to, body: payload.body }, 'Twilio not configured — SMS logged only');
      return { sid: `dev-${Date.now()}`, status: 'logged' };
    }

    try {
      const message = await client.messages.create({
        to: payload.to,
        from: env.TWILIO_PHONE_NUMBER,
        body: payload.body,
      });

      logger.info({ sid: message.sid, to: payload.to, status: message.status }, 'SMS sent via Twilio');
      return { sid: message.sid, status: message.status };
    } catch (err) {
      logger.error({ err, to: payload.to }, 'Twilio SMS delivery failed');
      throw err;
    }
  },

  /** Notify about a deadline approaching or overdue */
  async sendDeadlineAlert(params: {
    to: string;
    claimNumber: string;
    deadlineType: string;
    daysRemaining: number;
  }) {
    const urgency = params.daysRemaining <= 0 ? 'OVERDUE' : `${params.daysRemaining} days remaining`;
    const body = `FreightClaims Alert: Claim ${params.claimNumber} — ${params.deadlineType} deadline (${urgency}). Log in to review.`;
    return this.send({ to: params.to, body });
  },

  /** Notify about a claim status change */
  async sendStatusChange(params: {
    to: string;
    claimNumber: string;
    oldStatus: string;
    newStatus: string;
  }) {
    const body = `FreightClaims: Claim ${params.claimNumber} status changed from ${params.oldStatus} to ${params.newStatus}.`;
    return this.send({ to: params.to, body });
  },

  /** Notify about a payment received */
  async sendPaymentNotification(params: {
    to: string;
    claimNumber: string;
    amount: number;
    type: string;
  }) {
    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.amount);
    const body = `FreightClaims: ${params.type} payment of ${formatted} received for Claim ${params.claimNumber}.`;
    return this.send({ to: params.to, body });
  },

  /** Notify about carrier response received */
  async sendCarrierResponse(params: {
    to: string;
    claimNumber: string;
    responseType: string;
  }) {
    const body = `FreightClaims: Carrier responded to Claim ${params.claimNumber} — ${params.responseType}. Log in to review.`;
    return this.send({ to: params.to, body });
  },

  /**
   * Broadcast an SMS to all admin users who have a phone number on file.
   * Used for critical system-wide alerts.
   */
  async broadcastToAdmins(message: string) {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        phone: { not: null },
        role: { OR: [{ allClaims: true }, { allPermissions: true }] },
      },
      select: { id: true, phone: true, firstName: true },
    });

    const results = [];
    for (const admin of admins) {
      if (!admin.phone) continue;
      try {
        const result = await this.send({ to: admin.phone, body: message });
        results.push({ userId: admin.id, ...result });
      } catch (err) {
        results.push({ userId: admin.id, status: 'failed', error: String(err) });
      }
    }

    logger.info({ adminCount: admins.length, sent: results.filter((r) => r.status !== 'failed').length }, 'Admin broadcast complete');
    return results;
  },
};
