/**
 * Deadlines Service - Monitors Carmack Amendment deadlines and triggers alerts
 *
 * Checks all active claims for approaching or overdue deadlines and
 * creates notifications, tasks, and timeline entries as needed.
 * Designed to run on a schedule (e.g., daily via cron or Render Cron Job).
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const CARMACK_DEADLINES = {
  FILING_DEADLINE_MONTHS: 9,
  ACK_DEADLINE_DAYS: 30,
  DISPOSITION_DEADLINE_DAYS: 120,
};

interface DeadlineAlert {
  claimId: string;
  claimNumber: string;
  type: 'filing_expiring' | 'ack_overdue' | 'disposition_overdue' | 'ack_approaching' | 'disposition_approaching';
  dueDate: Date;
  daysRemaining: number;
  severity: 'info' | 'warning' | 'critical';
}

export async function checkDeadlines(): Promise<DeadlineAlert[]> {
  const alerts: DeadlineAlert[] = [];
  const now = new Date();

  // Get all active claims (not closed, settled, or cancelled)
  const activeClaims = await prisma.claim.findMany({
    where: {
      status: { notIn: ['closed', 'settled', 'cancelled'] },
      deletedAt: null,
    },
    select: {
      id: true,
      claimNumber: true,
      status: true,
      deliveryDate: true,
      filingDate: true,
      acknowledgmentDate: true,
      createdAt: true,
    },
  });

  for (const claim of activeClaims) {
    // Check filing deadline (9 months from delivery)
    if (claim.deliveryDate && !claim.filingDate) {
      const filingDeadline = new Date(claim.deliveryDate);
      filingDeadline.setMonth(filingDeadline.getMonth() + CARMACK_DEADLINES.FILING_DEADLINE_MONTHS);
      const daysRemaining = Math.floor((filingDeadline.getTime() - now.getTime()) / 86400000);

      if (daysRemaining <= 30 && daysRemaining > 0) {
        alerts.push({
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          type: 'filing_expiring',
          dueDate: filingDeadline,
          daysRemaining,
          severity: daysRemaining <= 7 ? 'critical' : 'warning',
        });
      }
    }

    // Check acknowledgment deadline (30 days from filing)
    if (claim.filingDate && !claim.acknowledgmentDate) {
      const ackDeadline = new Date(claim.filingDate);
      ackDeadline.setDate(ackDeadline.getDate() + CARMACK_DEADLINES.ACK_DEADLINE_DAYS);
      const daysRemaining = Math.floor((ackDeadline.getTime() - now.getTime()) / 86400000);

      if (daysRemaining <= 0) {
        alerts.push({
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          type: 'ack_overdue',
          dueDate: ackDeadline,
          daysRemaining,
          severity: 'critical',
        });
      } else if (daysRemaining <= 7) {
        alerts.push({
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          type: 'ack_approaching',
          dueDate: ackDeadline,
          daysRemaining,
          severity: 'warning',
        });
      }
    }

    // Check disposition deadline (120 days from filing)
    if (claim.filingDate) {
      const dispDeadline = new Date(claim.filingDate);
      dispDeadline.setDate(dispDeadline.getDate() + CARMACK_DEADLINES.DISPOSITION_DEADLINE_DAYS);
      const daysRemaining = Math.floor((dispDeadline.getTime() - now.getTime()) / 86400000);

      if (daysRemaining <= 0 && !['approved', 'denied', 'settled'].includes(claim.status)) {
        alerts.push({
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          type: 'disposition_overdue',
          dueDate: dispDeadline,
          daysRemaining,
          severity: 'critical',
        });
      } else if (daysRemaining <= 14 && daysRemaining > 0 && !['approved', 'denied', 'settled'].includes(claim.status)) {
        alerts.push({
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          type: 'disposition_approaching',
          dueDate: dispDeadline,
          daysRemaining,
          severity: 'warning',
        });
      }
    }
  }

  // Create notifications for critical/warning alerts
  if (alerts.length > 0) {
    const notifications = alerts.map((alert) => {
      const messages: Record<string, string> = {
        filing_expiring: `Claim ${alert.claimNumber}: Filing deadline in ${alert.daysRemaining} days`,
        ack_overdue: `Claim ${alert.claimNumber}: Carrier acknowledgment is ${Math.abs(alert.daysRemaining)} days overdue`,
        ack_approaching: `Claim ${alert.claimNumber}: Carrier acknowledgment due in ${alert.daysRemaining} days`,
        disposition_overdue: `Claim ${alert.claimNumber}: Carrier disposition is ${Math.abs(alert.daysRemaining)} days overdue`,
        disposition_approaching: `Claim ${alert.claimNumber}: Carrier disposition due in ${alert.daysRemaining} days`,
      };

      return {
        title: alert.severity === 'critical' ? 'URGENT: Deadline Alert' : 'Deadline Reminder',
        message: messages[alert.type],
        type: alert.severity === 'critical' ? 'error' : 'warning',
        link: `/claims/${alert.claimId}`,
      };
    });

    // Find admin users to notify
    const adminUsers = await prisma.user.findMany({
      where: { isActive: true, role: { OR: [{ allClaims: true }, { allPermissions: true }] } },
      select: { id: true },
    });

    const notifData = adminUsers.flatMap((user: any) =>
      notifications.map((n) => ({ ...n, userId: user.id }))
    );

    if (notifData.length > 0) {
      await prisma.notification.createMany({ data: notifData }).catch((err: any) =>
        logger.warn({ err }, 'Failed to create deadline notifications')
      );
    }

    logger.info({ alertCount: alerts.length, notifiedUsers: adminUsers.length }, 'Deadline check completed');
  }

  return alerts;
}

/**
 * Auto-acknowledge claims that have been filed for 30+ days without carrier response.
 * Creates a timeline entry noting the carrier has not responded.
 */
export async function flagUnacknowledgedClaims(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const unacked = await prisma.claim.findMany({
    where: {
      filingDate: { lte: thirtyDaysAgo },
      acknowledgmentDate: null,
      status: { in: ['pending', 'in_review'] },
      deletedAt: null,
    },
    select: { id: true, claimNumber: true, createdById: true },
  });

  for (const claim of unacked) {
    await prisma.claimTimeline.create({
      data: {
        claimId: claim.id,
        status: 'ack_overdue',
        description: 'Carrier has not acknowledged this claim within the 30-day Carmack Amendment deadline.',
        changedById: claim.createdById,
      },
    }).catch(() => {});
  }

  return unacked.length;
}
