/**
 * SMTP Service - Nodemailer transport for outbound email
 *
 * Configured for SendGrid SMTP by default, but works with any SMTP provider.
 * Falls back to logging-only mode when SMTP credentials are not configured,
 * so development environments don't need a mail server.
 *
 * Location: apps/api/src/services/smtp.service.ts
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

let transporter: Transporter | null = null;

const isConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14,
  });

  transporter.verify().then(() => {
    logger.info({ host: env.SMTP_HOST }, 'SMTP transport verified and ready');
  }).catch((err) => {
    logger.error({ err, host: env.SMTP_HOST }, 'SMTP transport verification failed');
  });
} else {
  logger.warn('SMTP not configured — emails will be logged but not delivered');
}

export const smtpService = {
  get isReady() {
    return transporter !== null;
  },

  async sendEmail(payload: EmailPayload): Promise<{ messageId: string; accepted: string[] }> {
    const from = payload.from || env.EMAIL_FROM;

    if (!transporter) {
      logger.info({ to: payload.to, subject: payload.subject }, 'SMTP not configured — email logged only');
      return { messageId: `dev-${Date.now()}`, accepted: Array.isArray(payload.to) ? payload.to : [payload.to] };
    }

    const info = await transporter.sendMail({
      from,
      to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      cc: payload.cc ? (Array.isArray(payload.cc) ? payload.cc.join(', ') : payload.cc) : undefined,
      bcc: payload.bcc ? (Array.isArray(payload.bcc) ? payload.bcc.join(', ') : payload.bcc) : undefined,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      attachments: payload.attachments,
    });

    logger.info(
      { messageId: info.messageId, to: payload.to, subject: payload.subject },
      'Email sent via SMTP',
    );

    return {
      messageId: info.messageId,
      accepted: (info.accepted || []) as string[],
    };
  },

  async sendClaimNotification(params: {
    to: string;
    claimNumber: string;
    subject: string;
    body: string;
    claimUrl?: string;
  }) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">FreightClaims</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">${params.body}</p>
          ${params.claimUrl ? `<a href="${params.claimUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">View Claim ${params.claimNumber}</a>` : ''}
        </div>
        <div style="padding: 12px 24px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>FreightClaims &mdash; Freight Claim Management Platform</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `[${params.claimNumber}] ${params.subject}`,
      html,
      text: params.body,
    });
  },

  async sendPasswordReset(params: { to: string; resetUrl: string; userName: string }) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">FreightClaims</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Password Reset</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Hi ${params.userName},<br><br>
            We received a request to reset your password. Click the button below to set a new password.
            This link expires in 1 hour.
          </p>
          <a href="${params.resetUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">Reset Password</a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'Password Reset - FreightClaims',
      html,
      text: `Reset your password: ${params.resetUrl}`,
    });
  },

  async sendVerification(params: { to: string; userName: string; verifyUrl: string }) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">FreightClaims</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Verify Your Email</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Hi ${params.userName},<br><br>
            Thanks for signing up! Please verify your email address by clicking the button below.
          </p>
          <a href="${params.verifyUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">Verify Email</a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            If you didn't create an account, you can ignore this email.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'Verify Your Email - FreightClaims',
      html,
      text: `Verify your email: ${params.verifyUrl}`,
    });
  },

  async sendWelcome(params: { to: string; userName: string; loginUrl: string }) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">FreightClaims</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Welcome to FreightClaims!</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Hi ${params.userName},<br><br>
            Your account has been created. You can now log in and start managing freight claims.
          </p>
          <a href="${params.loginUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">Log In</a>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'Welcome to FreightClaims',
      html,
      text: `Welcome to FreightClaims, ${params.userName}! Log in at ${params.loginUrl}`,
    });
  },
};
