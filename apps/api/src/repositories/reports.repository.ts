/**
 * ReportsRepository - Analytics and reporting queries
 *
 * Location: apps/api/src/repositories/reports.repository.ts
 */
import { prisma } from '../config/database';

function buildDateWhere(body: Record<string, unknown>) {
  const dateFrom = (body.startDate || body.dateFrom) as string | undefined;
  const dateTo = (body.endDate || body.dateTo) as string | undefined;
  if (!dateFrom && !dateTo) return undefined;
  return {
    ...(dateFrom && { gte: new Date(dateFrom) }),
    ...(dateTo && { lte: new Date(dateTo) }),
  };
}

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

  async getInsightsReport(body: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(body);
    if (dateFilter) where.createdAt = dateFilter;

    const [totalClaims, statusBreakdown, typeBreakdown, amounts] = await Promise.all([
      prisma.claim.count({ where: where as any }),
      prisma.claim.groupBy({ by: ['status'], where: where as any, _count: true }),
      prisma.claim.groupBy({ by: ['claimType'], where: where as any, _count: true }),
      prisma.claim.aggregate({
        where: where as any,
        _sum: { claimAmount: true, settledAmount: true },
        _avg: { claimAmount: true, settledAmount: true },
      }),
    ]);

    const settled = statusBreakdown.find((s) => s.status === 'settled')?._count ?? 0;
    const denied = statusBreakdown.find((s) => s.status === 'denied')?._count ?? 0;

    return {
      totalClaims,
      settlementRate: totalClaims > 0 ? Math.round((settled / totalClaims) * 100) : 0,
      denialRate: totalClaims > 0 ? Math.round((denied / totalClaims) * 100) : 0,
      statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count })),
      typeBreakdown: typeBreakdown.map((t) => ({ type: t.claimType, count: t._count })),
      totalClaimAmount: Number(amounts._sum.claimAmount ?? 0),
      totalSettledAmount: Number(amounts._sum.settledAmount ?? 0),
      avgClaimAmount: Number(amounts._avg.claimAmount ?? 0),
      avgSettledAmount: Number(amounts._avg.settledAmount ?? 0),
    };
  },

  async getTopCustomers(body: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(body);
    if (dateFilter) where.createdAt = dateFilter;

    const grouped = await prisma.claim.groupBy({
      by: ['customerId'],
      where: where as any,
      _count: { _all: true },
      _sum: { claimAmount: true, settledAmount: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: Number(body.limit) || 10,
    });

    const customerIds = grouped.map((g) => g.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, code: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return grouped.map((g) => ({
      customerId: g.customerId,
      customerName: customerMap.get(g.customerId)?.name ?? 'Unknown',
      customerCode: customerMap.get(g.customerId)?.code ?? null,
      claimCount: g._count._all,
      totalClaimAmount: Number(g._sum.claimAmount ?? 0),
      totalSettledAmount: Number(g._sum.settledAmount ?? 0),
    }));
  },

  async getTopCarriers(body: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(body);
    if (dateFilter) where.createdAt = dateFilter;

    const claims = await prisma.claim.findMany({
      where: where as any,
      select: {
        claimAmount: true,
        settledAmount: true,
        parties: { where: { type: 'carrier' }, select: { name: true, scacCode: true } },
      },
    });

    const carrierMap = new Map<string, { name: string; scacCode: string | null; claimCount: number; totalClaimAmount: number; totalSettledAmount: number }>();
    for (const claim of claims) {
      const carrier = claim.parties[0];
      if (!carrier) continue;
      const existing = carrierMap.get(carrier.name);
      if (existing) {
        existing.claimCount++;
        existing.totalClaimAmount += Number(claim.claimAmount ?? 0);
        existing.totalSettledAmount += Number(claim.settledAmount ?? 0);
      } else {
        carrierMap.set(carrier.name, {
          name: carrier.name,
          scacCode: carrier.scacCode,
          claimCount: 1,
          totalClaimAmount: Number(claim.claimAmount ?? 0),
          totalSettledAmount: Number(claim.settledAmount ?? 0),
        });
      }
    }

    return Array.from(carrierMap.values())
      .sort((a, b) => b.claimCount - a.claimCount)
      .slice(0, Number(body.limit) || 10);
  },

  async getCollectionPercentage(body: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(body);
    if (dateFilter) where.createdAt = dateFilter;

    const [claimTotals, paymentTotal] = await Promise.all([
      prisma.claim.aggregate({
        where: where as any,
        _sum: { claimAmount: true, settledAmount: true },
      }),
      prisma.claimPayment.aggregate({
        where: { claim: where as any },
        _sum: { amount: true },
      }),
    ]);

    const totalFiled = Number(claimTotals._sum.claimAmount ?? 0);
    const totalSettled = Number(claimTotals._sum.settledAmount ?? 0);
    const totalPaid = Number(paymentTotal._sum.amount ?? 0);
    const collectionPercentage = totalFiled > 0 ? Math.round((totalPaid / totalFiled) * 10000) / 100 : 0;
    const settlementPercentage = totalFiled > 0 ? Math.round((totalSettled / totalFiled) * 10000) / 100 : 0;

    return {
      totalFiled,
      totalSettled,
      totalPaid,
      collectionPercentage,
      settlementPercentage,
      outstandingAmount: totalFiled - totalPaid,
    };
  },

  async getMetricsPerCarrier(body: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(body);
    if (dateFilter) where.createdAt = dateFilter;

    const claims = await prisma.claim.findMany({
      where: where as any,
      select: {
        claimAmount: true,
        settledAmount: true,
        status: true,
        parties: { where: { type: 'carrier' }, select: { name: true, scacCode: true } },
      },
    });

    const carrierMap = new Map<string, { name: string; scacCode: string | null; claimCount: number; totalClaimAmount: number; totalSettledAmount: number; settledCount: number; deniedCount: number }>();
    for (const claim of claims) {
      const carrier = claim.parties[0];
      if (!carrier) continue;
      const existing = carrierMap.get(carrier.name);
      if (existing) {
        existing.claimCount++;
        existing.totalClaimAmount += Number(claim.claimAmount ?? 0);
        existing.totalSettledAmount += Number(claim.settledAmount ?? 0);
        if (claim.status === 'settled') existing.settledCount++;
        if (claim.status === 'denied') existing.deniedCount++;
      } else {
        carrierMap.set(carrier.name, {
          name: carrier.name,
          scacCode: carrier.scacCode,
          claimCount: 1,
          totalClaimAmount: Number(claim.claimAmount ?? 0),
          totalSettledAmount: Number(claim.settledAmount ?? 0),
          settledCount: claim.status === 'settled' ? 1 : 0,
          deniedCount: claim.status === 'denied' ? 1 : 0,
        });
      }
    }

    return Array.from(carrierMap.values()).map((c) => ({
      ...c,
      avgClaimAmount: c.claimCount > 0 ? Math.round((c.totalClaimAmount / c.claimCount) * 100) / 100 : 0,
      settlementRate: c.claimCount > 0 ? Math.round((c.settledCount / c.claimCount) * 100) : 0,
      denialRate: c.claimCount > 0 ? Math.round((c.deniedCount / c.claimCount) * 100) : 0,
    }));
  },

  async getMetricsPerDestination(body: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(body);
    if (dateFilter) where.createdAt = dateFilter;

    const claims = await prisma.claim.findMany({
      where: where as any,
      select: {
        claimAmount: true,
        settledAmount: true,
        status: true,
        parties: { where: { type: 'consignee' }, select: { city: true, state: true } },
      },
    });

    const destMap = new Map<string, { city: string; state: string; claimCount: number; totalClaimAmount: number; totalSettledAmount: number }>();
    for (const claim of claims) {
      const dest = claim.parties[0];
      if (!dest?.city) continue;
      const key = `${dest.city}, ${dest.state || ''}`.trim();
      const existing = destMap.get(key);
      if (existing) {
        existing.claimCount++;
        existing.totalClaimAmount += Number(claim.claimAmount ?? 0);
        existing.totalSettledAmount += Number(claim.settledAmount ?? 0);
      } else {
        destMap.set(key, {
          city: dest.city,
          state: dest.state || '',
          claimCount: 1,
          totalClaimAmount: Number(claim.claimAmount ?? 0),
          totalSettledAmount: Number(claim.settledAmount ?? 0),
        });
      }
    }

    return Array.from(destMap.values())
      .sort((a, b) => b.claimCount - a.claimCount)
      .slice(0, Number(body.limit) || 20);
  },

  async getWriteOffAmount(body: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null, status: { in: ['denied', 'cancelled'] } };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(body);
    if (dateFilter) where.createdAt = dateFilter;

    const [writeOffAgg, paymentRecovery] = await Promise.all([
      prisma.claim.aggregate({
        where: where as any,
        _sum: { claimAmount: true },
        _count: { _all: true },
      }),
      prisma.claimPayment.aggregate({
        where: { claim: where as any },
        _sum: { amount: true },
      }),
    ]);

    const totalWrittenOff = Number(writeOffAgg._sum.claimAmount ?? 0);
    const recovered = Number(paymentRecovery._sum.amount ?? 0);

    return {
      totalWrittenOff,
      recovered,
      netWriteOff: totalWrittenOff - recovered,
      claimCount: writeOffAgg._count._all,
    };
  },

  async exportReport(type: string, query: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    const dateFilter = buildDateWhere(query);
    if (dateFilter) where.createdAt = dateFilter;

    if (type === 'claims' || !type) {
      const claims = await prisma.claim.findMany({
        where: where as any,
        include: {
          customer: { select: { name: true } },
          parties: { where: { type: 'carrier' }, select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit) || 5000,
      });

      const headers = ['Claim Number', 'PRO Number', 'Status', 'Type', 'Claim Amount', 'Settled Amount', 'Customer', 'Carrier', 'Ship Date', 'Delivery Date', 'Filing Date', 'Created'];
      const rows = claims.map((c) => [
        c.claimNumber,
        c.proNumber,
        c.status,
        c.claimType,
        Number(c.claimAmount),
        c.settledAmount ? Number(c.settledAmount) : '',
        c.customer.name,
        c.parties[0]?.name ?? '',
        c.shipDate?.toISOString().split('T')[0] ?? '',
        c.deliveryDate?.toISOString().split('T')[0] ?? '',
        c.filingDate?.toISOString().split('T')[0] ?? '',
        c.createdAt.toISOString().split('T')[0],
      ]);

      const csvLines = [
        headers.join(','),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ];

      return {
        filename: `claims-export-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
        data: csvLines.join('\n'),
      };
    }

    return { filename: `${type}-export.csv`, contentType: 'text/csv', data: '' };
  },
};
