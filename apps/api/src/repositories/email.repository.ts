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
import { storageService } from '../services/storage.service';

export const emailRepository = {
  /** Sends an email via SMTP and logs it to the database */
  async send(data: Record<string, unknown>) {
    const from = (data.from as string) || 'claims@freightclaims.com';
    const toRaw = data.to;
    const toArr = Array.isArray(toRaw) ? (toRaw as string[]).filter(Boolean) : [String(toRaw ?? '')].filter(Boolean);
    const to = toArr.join(', ');
    const ccRaw = data.cc;
    const ccArr = Array.isArray(ccRaw) ? (ccRaw as string[]).filter(Boolean) : ccRaw ? [String(ccRaw)].filter(Boolean) : [];
    const subject = data.subject as string;
    const body = data.body as string;

    const attachmentIds = Array.isArray(data.attachmentIds) ? data.attachmentIds as string[] : [];
    const smtpAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];

    if (attachmentIds.length > 0) {
      const docs = await prisma.claimDocument.findMany({
        where: { id: { in: attachmentIds } },
        select: { id: true, documentName: true, s3Key: true, mimeType: true },
      });
      for (const doc of docs) {
        try {
          const { body: fileBuffer, contentType } = await storageService.downloadDocument(doc.s3Key);
          smtpAttachments.push({
            filename: doc.documentName,
            content: fileBuffer,
            contentType: contentType || doc.mimeType || 'application/octet-stream',
          });
        } catch (err) {
          logger.warn({ err, docId: doc.id, s3Key: doc.s3Key }, 'Failed to download attachment for email');
        }
      }
    }

    let status = 'pending';
    let messageId: string | null = null;

    try {
      const result = await smtpService.sendEmail({
        to: to || toArr,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, ''),
        from,
        ...(ccArr.length > 0 && { cc: ccArr.join(', ') }),
        ...(smtpAttachments.length > 0 && { attachments: smtpAttachments }),
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
        cc: ccArr.join(', ') || null,
        bcc: (data.bcc as string) || null,
        contentHtml: body || null,
        messageId: messageId || null,
        inReplyTo: (data.inReplyTo as string) || null,
        threadId: (data.threadId as string) || (data.claimId as string) || null,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      },
    });

    logger.info({ emailId: logEntry.id, to, status, messageId }, 'Email dispatched');
    return { sent: status === 'sent', emailId: logEntry.id, messageId };
  },

  async getByClaimId(claimId: string) {
    const logs = await prisma.emailLog.findMany({ where: { claimId }, orderBy: { createdAt: 'desc' } });
    return logs.map((log: any) => ({
      id: log.id,
      from: log.from || '',
      to: log.to ? log.to.split(/[,;]\s*/).filter(Boolean) : [],
      cc: log.cc ? log.cc.split(/[,;]\s*/).filter(Boolean) : [],
      bcc: log.bcc ? log.bcc.split(/[,;]\s*/).filter(Boolean) : [],
      subject: log.subject || '',
      body: log.body || '',
      contentHtml: log.contentHtml || log.body || '',
      date: log.createdAt,
      messageId: log.messageId || null,
      threadId: log.threadId || null,
      inReplyTo: log.inReplyTo || null,
      attachmentIds: log.attachmentIds || [],
      openCount: log.openCount || 0,
      isRead: true,
      isInbound: log.direction === 'inbound',
      status: log.status,
    }));
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
