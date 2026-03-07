/**
 * ReportsRepository - Analytics and reporting queries
 *
 * Location: apps/api/src/repositories/reports.repository.ts
 */
import { prisma } from '../config/database';

export const reportsRepository = {
  async getDashboard(corporateId?: string | null) {
    const where = corporateId ? { corporateId } : {};

    const [total, pending, settled, denied, recent] = await Promise.all([
      prisma.claim.count({ where }),
      prisma.claim.count({ where: { ...where, status: { in: ['pending', 'in_review'] } } }),
      prisma.claim.count({ where: { ...where, status: 'settled' } }),
      prisma.claim.count({ where: { ...where, status: 'denied' } }),
      prisma.claim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, claimNumber: true, description: true, status: true, claimAmount: true, createdAt: true },
      }),
    ]);

    const settlementRate = total > 0 ? Math.round((settled / total) * 100) : 0;

    const statusCounts = await prisma.claim.groupBy({ by: ['status'], where, _count: true });
    const claimsByStatus = statusCounts.map((s) => ({
      name: s.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count: s._count,
    }));

    const typeCounts = await prisma.claim.groupBy({ by: ['claimType'], where, _count: true });
    const claimsByType = typeCounts.map((t) => ({
      name: (t.claimType || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count: t._count,
    }));

    return {
      stats: [
        { label: 'Total Claims', value: total, change: 0 },
        { label: 'Pending Review', value: pending, change: 0 },
        { label: 'Settlement Rate', value: settlementRate, change: 0 },
        { label: 'Denied', value: denied, change: 0 },
      ],
      claimsByStatus,
      claimsByType,
      monthlyTrend: [],
      topCarriers: [],
      recentClaims: recent.map((c) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        title: c.description || c.claimNumber,
        status: c.status,
        amount: c.claimAmount ? Number(c.claimAmount) : 0,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  },

  async getInsightsReport(body: Record<string, unknown>, customerId?: string) { void body; void customerId; return {}; },
  async getTopCustomers(body: Record<string, unknown>, customerId?: string) { void body; void customerId; return []; },
  async getTopCarriers(body: Record<string, unknown>, customerId?: string) { void body; void customerId; return []; },
  async getCollectionPercentage(body: Record<string, unknown>, customerId?: string) { void body; void customerId; return {}; },
  async getMetricsPerCarrier(body: Record<string, unknown>, customerId?: string) { void body; void customerId; return []; },
  async getMetricsPerDestination(body: Record<string, unknown>, customerId?: string) { void body; void customerId; return []; },
  async getWriteOffAmount(body: Record<string, unknown>, customerId?: string) { void body; void customerId; return {}; },
  async exportReport(type: string, query: Record<string, unknown>, customerId?: string) { void type; void query; void customerId; return {}; },
};
