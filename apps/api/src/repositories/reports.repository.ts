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

function parseDateRange(dateRange: string | undefined): { gte?: Date; lte?: Date } | undefined {
  if (!dateRange || dateRange === 'all') return undefined;
  const now = new Date();
  let gte: Date;
  switch (dateRange) {
    case '30d':
      gte = new Date(now.getTime() - 30 * 86400000);
      break;
    case '3m':
      gte = new Date(now);
      gte.setMonth(gte.getMonth() - 3);
      break;
    case '6m':
      gte = new Date(now);
      gte.setMonth(gte.getMonth() - 6);
      break;
    case '1y':
      gte = new Date(now);
      gte.setFullYear(gte.getFullYear() - 1);
      break;
    default:
      return undefined;
  }
  return { gte };
}

function escapeCSV(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCSV).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCSV).join(','));
  }
  return lines.join('\n');
}

function getContentType(format: string): string {
  switch (format) {
    case 'pdf': return 'application/pdf';
    case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default: return 'text/csv';
  }
}

function getExtension(format: string): string {
  switch (format) {
    case 'pdf': return 'pdf';
    case 'excel': return 'xlsx';
    default: return 'csv';
  }
}

// ------- Shared monthly trend & top carriers helpers -------

async function buildMonthlyTrend(where: Record<string, unknown>) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const claims = await prisma.claim.findMany({
    where: { ...where, createdAt: { gte: sixMonthsAgo } } as any,
    select: { createdAt: true, status: true, claimAmount: true },
  });

  const months: Record<string, { filed: number; settled: number; amount: number }> = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    months[key] = { filed: 0, settled: 0, amount: 0 };
  }

  for (const c of claims) {
    const key = c.createdAt.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (months[key]) {
      months[key].filed++;
      months[key].amount += Number(c.claimAmount || 0);
      if (c.status === 'settled') months[key].settled++;
    }
  }

  return Object.entries(months).map(([month, data]) => ({ month, ...data }));
}

async function buildTopCarriers(where: Record<string, unknown>) {
  const parties = await prisma.claimParty.findMany({
    where: { type: 'carrier', claim: where } as any,
    select: { name: true, claim: { select: { claimAmount: true, settledAmount: true } } },
  });

  const byCarrier: Record<string, { claims: number; totalSettlement: number }> = {};
  for (const p of parties) {
    const name = p.name || 'Unknown';
    if (!byCarrier[name]) byCarrier[name] = { claims: 0, totalSettlement: 0 };
    byCarrier[name].claims++;
    byCarrier[name].totalSettlement += Number(p.claim?.settledAmount ?? 0);
  }

  return Object.entries(byCarrier)
    .sort((a, b) => b[1].claims - a[1].claims)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      claims: data.claims,
      avgSettlement: data.claims > 0 ? Math.round(data.totalSettlement / data.claims) : 0,
    }));
}

// ------- Report data generators -------

async function generateCollectionPercentage(where: any) {
  const claims = await prisma.claim.findMany({
    where,
    select: {
      claimAmount: true,
      settledAmount: true,
      status: true,
      parties: { where: { type: 'carrier' }, select: { name: true, scacCode: true } },
    },
  });

  const carrierMap = new Map<string, { name: string; scac: string; totalClaimed: number; totalSettled: number; claimCount: number; settledCount: number }>();
  for (const c of claims) {
    const carrier = c.parties[0];
    const carrierName = carrier?.name ?? 'Unknown';
    const existing = carrierMap.get(carrierName);
    if (existing) {
      existing.totalClaimed += Number(c.claimAmount ?? 0);
      existing.totalSettled += Number(c.settledAmount ?? 0);
      existing.claimCount++;
      if (c.status === 'settled') existing.settledCount++;
    } else {
      carrierMap.set(carrierName, {
        name: carrierName,
        scac: carrier?.scacCode ?? '',
        totalClaimed: Number(c.claimAmount ?? 0),
        totalSettled: Number(c.settledAmount ?? 0),
        claimCount: 1,
        settledCount: c.status === 'settled' ? 1 : 0,
      });
    }
  }

  const rows = Array.from(carrierMap.values())
    .sort((a, b) => b.totalClaimed - a.totalClaimed)
    .map((c) => [
      c.name,
      c.scac,
      c.claimCount,
      c.settledCount,
      c.totalClaimed.toFixed(2),
      c.totalSettled.toFixed(2),
      c.totalClaimed > 0 ? ((c.totalSettled / c.totalClaimed) * 100).toFixed(1) + '%' : '0%',
    ]);

  return {
    headers: ['Carrier', 'SCAC', 'Total Claims', 'Settled Claims', 'Total Claimed ($)', 'Total Settled ($)', 'Collection Rate'],
    rows,
  };
}

async function generateTopCustomers(where: any) {
  const grouped = await prisma.claim.groupBy({
    by: ['customerId'],
    where,
    _count: { _all: true },
    _sum: { claimAmount: true, settledAmount: true },
    orderBy: { _count: { customerId: 'desc' } },
    take: 50,
  });

  const customerIds = grouped.map((g) => g.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, code: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const rows = grouped.map((g) => [
    customerMap.get(g.customerId)?.name ?? 'Unknown',
    customerMap.get(g.customerId)?.code ?? '',
    g._count._all,
    Number(g._sum.claimAmount ?? 0).toFixed(2),
    Number(g._sum.settledAmount ?? 0).toFixed(2),
  ]);

  return {
    headers: ['Customer Name', 'Customer Code', 'Claim Count', 'Total Claimed ($)', 'Total Settled ($)'],
    rows,
  };
}

async function generateTopCarriers(where: any) {
  const claims = await prisma.claim.findMany({
    where,
    select: {
      claimAmount: true,
      settledAmount: true,
      status: true,
      parties: { where: { type: 'carrier' }, select: { name: true, scacCode: true } },
    },
  });

  const carrierMap = new Map<string, { name: string; scac: string; claimCount: number; totalClaimed: number; totalSettled: number; deniedCount: number }>();
  for (const c of claims) {
    const carrier = c.parties[0];
    if (!carrier) continue;
    const existing = carrierMap.get(carrier.name);
    if (existing) {
      existing.claimCount++;
      existing.totalClaimed += Number(c.claimAmount ?? 0);
      existing.totalSettled += Number(c.settledAmount ?? 0);
      if (c.status === 'denied') existing.deniedCount++;
    } else {
      carrierMap.set(carrier.name, {
        name: carrier.name,
        scac: carrier.scacCode ?? '',
        claimCount: 1,
        totalClaimed: Number(c.claimAmount ?? 0),
        totalSettled: Number(c.settledAmount ?? 0),
        deniedCount: c.status === 'denied' ? 1 : 0,
      });
    }
  }

  const rows = Array.from(carrierMap.values())
    .sort((a, b) => b.claimCount - a.claimCount)
    .map((c) => [
      c.name,
      c.scac,
      c.claimCount,
      c.totalClaimed.toFixed(2),
      c.totalSettled.toFixed(2),
      c.deniedCount,
      c.claimCount > 0 ? ((c.deniedCount / c.claimCount) * 100).toFixed(1) + '%' : '0%',
    ]);

  return {
    headers: ['Carrier', 'SCAC', 'Total Claims', 'Total Claimed ($)', 'Total Settled ($)', 'Denied Count', 'Denial Rate'],
    rows,
  };
}

async function generateMetricsByCarrier(where: any) {
  const claims = await prisma.claim.findMany({
    where,
    select: {
      claimAmount: true,
      settledAmount: true,
      status: true,
      filingDate: true,
      createdAt: true,
      parties: { where: { type: 'carrier' }, select: { name: true, scacCode: true } },
    },
  });

  const now = new Date();
  const carrierMap = new Map<string, { name: string; scac: string; claimCount: number; totalClaimed: number; totalSettled: number; settledCount: number; deniedCount: number; totalDaysOpen: number }>();

  for (const c of claims) {
    const carrier = c.parties[0];
    if (!carrier) continue;
    const daysOpen = Math.floor((now.getTime() - c.createdAt.getTime()) / 86400000);
    const existing = carrierMap.get(carrier.name);
    if (existing) {
      existing.claimCount++;
      existing.totalClaimed += Number(c.claimAmount ?? 0);
      existing.totalSettled += Number(c.settledAmount ?? 0);
      if (c.status === 'settled') existing.settledCount++;
      if (c.status === 'denied') existing.deniedCount++;
      existing.totalDaysOpen += daysOpen;
    } else {
      carrierMap.set(carrier.name, {
        name: carrier.name,
        scac: carrier.scacCode ?? '',
        claimCount: 1,
        totalClaimed: Number(c.claimAmount ?? 0),
        totalSettled: Number(c.settledAmount ?? 0),
        settledCount: c.status === 'settled' ? 1 : 0,
        deniedCount: c.status === 'denied' ? 1 : 0,
        totalDaysOpen: daysOpen,
      });
    }
  }

  const rows = Array.from(carrierMap.values())
    .sort((a, b) => b.claimCount - a.claimCount)
    .map((c) => [
      c.name,
      c.scac,
      c.claimCount,
      c.totalClaimed.toFixed(2),
      c.totalSettled.toFixed(2),
      (c.totalClaimed / Math.max(c.claimCount, 1)).toFixed(2),
      c.settledCount,
      c.deniedCount,
      c.claimCount > 0 ? ((c.settledCount / c.claimCount) * 100).toFixed(1) + '%' : '0%',
      c.claimCount > 0 ? ((c.deniedCount / c.claimCount) * 100).toFixed(1) + '%' : '0%',
      Math.round(c.totalDaysOpen / Math.max(c.claimCount, 1)),
    ]);

  return {
    headers: ['Carrier', 'SCAC', 'Claims', 'Total Claimed ($)', 'Total Settled ($)', 'Avg Claim ($)', 'Settled', 'Denied', 'Settlement Rate', 'Denial Rate', 'Avg Days Open'],
    rows,
  };
}

async function generateMetricsByDestination(where: any) {
  const claims = await prisma.claim.findMany({
    where,
    select: {
      claimAmount: true,
      settledAmount: true,
      status: true,
      parties: { where: { type: 'consignee' }, select: { city: true, state: true } },
    },
  });

  const destMap = new Map<string, { city: string; state: string; claimCount: number; totalClaimed: number; totalSettled: number; settledCount: number; deniedCount: number }>();
  for (const c of claims) {
    const dest = c.parties[0];
    if (!dest?.city) continue;
    const key = `${dest.city}, ${dest.state || ''}`.trim();
    const existing = destMap.get(key);
    if (existing) {
      existing.claimCount++;
      existing.totalClaimed += Number(c.claimAmount ?? 0);
      existing.totalSettled += Number(c.settledAmount ?? 0);
      if (c.status === 'settled') existing.settledCount++;
      if (c.status === 'denied') existing.deniedCount++;
    } else {
      destMap.set(key, {
        city: dest.city,
        state: dest.state || '',
        claimCount: 1,
        totalClaimed: Number(c.claimAmount ?? 0),
        totalSettled: Number(c.settledAmount ?? 0),
        settledCount: c.status === 'settled' ? 1 : 0,
        deniedCount: c.status === 'denied' ? 1 : 0,
      });
    }
  }

  const rows = Array.from(destMap.values())
    .sort((a, b) => b.claimCount - a.claimCount)
    .map((d) => [
      d.city,
      d.state,
      d.claimCount,
      d.totalClaimed.toFixed(2),
      d.totalSettled.toFixed(2),
      (d.totalClaimed / Math.max(d.claimCount, 1)).toFixed(2),
      d.settledCount,
      d.deniedCount,
    ]);

  return {
    headers: ['City', 'State', 'Claims', 'Total Claimed ($)', 'Total Settled ($)', 'Avg Claim ($)', 'Settled', 'Denied'],
    rows,
  };
}

async function generateWriteOff(where: any) {
  const claims = await prisma.claim.findMany({
    where: { ...where, status: { in: ['denied', 'cancelled'] } },
    select: { claimAmount: true, settledAmount: true, createdAt: true, status: true },
  });

  const monthMap = new Map<string, { month: string; count: number; totalWriteOff: number; recovered: number }>();
  for (const c of claims) {
    const month = c.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
    const existing = monthMap.get(month);
    const writeOff = Number(c.claimAmount ?? 0);
    const recovered = Number(c.settledAmount ?? 0);
    if (existing) {
      existing.count++;
      existing.totalWriteOff += writeOff;
      existing.recovered += recovered;
    } else {
      monthMap.set(month, { month, count: 1, totalWriteOff: writeOff, recovered });
    }
  }

  const rows = Array.from(monthMap.values())
    .map((m) => [
      m.month,
      m.count,
      m.totalWriteOff.toFixed(2),
      m.recovered.toFixed(2),
      (m.totalWriteOff - m.recovered).toFixed(2),
    ]);

  return {
    headers: ['Month', 'Claims', 'Total Write-Off ($)', 'Recovered ($)', 'Net Write-Off ($)'],
    rows,
  };
}

async function generateAging(where: any) {
  const claims = await prisma.claim.findMany({
    where: { ...where, status: { notIn: ['settled', 'closed', 'cancelled'] } },
    select: {
      claimNumber: true,
      claimAmount: true,
      status: true,
      createdAt: true,
      customer: { select: { name: true } },
      parties: { where: { type: 'carrier' }, select: { name: true } },
    },
  });

  const now = new Date();
  const brackets: Record<string, { label: string; count: number; totalAmount: number }> = {
    '0-30': { label: '0-30 days', count: 0, totalAmount: 0 },
    '31-60': { label: '31-60 days', count: 0, totalAmount: 0 },
    '61-90': { label: '61-90 days', count: 0, totalAmount: 0 },
    '91-120': { label: '91-120 days', count: 0, totalAmount: 0 },
    '120+': { label: '120+ days', count: 0, totalAmount: 0 },
  };

  const detailRows: unknown[][] = [];

  for (const c of claims) {
    const age = Math.floor((now.getTime() - c.createdAt.getTime()) / 86400000);
    let bracket: string;
    if (age <= 30) bracket = '0-30';
    else if (age <= 60) bracket = '31-60';
    else if (age <= 90) bracket = '61-90';
    else if (age <= 120) bracket = '91-120';
    else bracket = '120+';

    const amt = Number(c.claimAmount ?? 0);
    brackets[bracket].count++;
    brackets[bracket].totalAmount += amt;

    detailRows.push([
      c.claimNumber,
      c.customer?.name ?? '',
      c.parties[0]?.name ?? '',
      c.status,
      amt.toFixed(2),
      age,
      brackets[bracket].label,
    ]);
  }

  detailRows.sort((a, b) => (b[5] as number) - (a[5] as number));

  return {
    headers: ['Claim Number', 'Customer', 'Carrier', 'Status', 'Claim Amount ($)', 'Days Open', 'Age Bracket'],
    rows: detailRows,
  };
}

async function generateInsurance(where: any) {
  const claims = await prisma.claim.findMany({
    where: { ...where, claimType: { in: ['loss', 'theft'] } },
    select: {
      claimNumber: true,
      claimAmount: true,
      settledAmount: true,
      status: true,
      claimType: true,
      createdAt: true,
      customer: { select: { name: true } },
      parties: { where: { type: 'carrier' }, select: { name: true } },
    },
  });

  const rows = claims.map((c) => [
    c.claimNumber,
    c.customer?.name ?? '',
    c.parties[0]?.name ?? '',
    c.claimType,
    c.status,
    Number(c.claimAmount ?? 0).toFixed(2),
    Number(c.settledAmount ?? 0).toFixed(2),
    Number(c.claimAmount ?? 0) > 0
      ? ((Number(c.settledAmount ?? 0) / Number(c.claimAmount ?? 0)) * 100).toFixed(1) + '%'
      : '0%',
    c.createdAt.toISOString().split('T')[0],
  ]);

  return {
    headers: ['Claim Number', 'Customer', 'Carrier', 'Claim Type', 'Status', 'Claim Amount ($)', 'Settled Amount ($)', 'Recovery Rate', 'Filed Date'],
    rows,
  };
}

// ------- Main repository -------

export const reportsRepository = {
  async getDashboard(corporateId?: string | null) {
    const where = corporateId ? { corporateId } : {};

    const [total, pending, settled, aggregates, recent] = await Promise.all([
      prisma.claim.count({ where }),
      prisma.claim.count({ where: { ...where, status: { in: ['pending', 'in_review'] } } }),
      prisma.claim.count({ where: { ...where, status: 'settled' } }),
      prisma.claim.aggregate({
        where,
        _sum: { claimAmount: true, settledAmount: true },
        _avg: { settledAmount: true },
      }),
      prisma.claim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, claimNumber: true, description: true, status: true, claimAmount: true, createdAt: true },
      }),
    ]);

    const settlementRate = total > 0 ? Math.round((settled / total) * 100) : 0;
    const totalClaimValue = Number(aggregates._sum?.claimAmount ?? 0);
    const avgSettlement = Number(aggregates._avg?.settledAmount ?? 0);

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

    const complianceAlerts: string[] = [];
    const now = new Date();
    const openClaims = await prisma.claim.findMany({
      where: { ...where, status: { notIn: ['settled', 'closed', 'denied'] }, filingDate: { not: null } } as any,
      select: { filingDate: true },
    });
    let approaching120 = 0;
    let past30 = 0;
    for (const c of openClaims) {
      if (!c.filingDate) continue;
      const daysSinceFiling = Math.floor((now.getTime() - c.filingDate.getTime()) / 86400000);
      if (daysSinceFiling >= 100 && daysSinceFiling <= 120) approaching120++;
      if (daysSinceFiling > 30) past30++;
    }
    if (approaching120 > 0) complianceAlerts.push(`${approaching120} claim${approaching120 > 1 ? 's' : ''} approaching 120-day disposition deadline`);
    if (past30 > 0) complianceAlerts.push(`${past30} claim${past30 > 1 ? 's' : ''} past 30-day acknowledgment window`);

    return {
      stats: [
        { label: 'Total Claims', value: total, change: 0 },
        { label: 'Pending Review', value: pending, change: 0 },
        { label: 'Settlement Rate', value: settlementRate, change: 0 },
        { label: 'Avg Settlement', value: Math.round(avgSettlement), change: 0 },
      ],
      totalClaimValue,
      claimsByStatus,
      claimsByType,
      monthlyTrend: await buildMonthlyTrend(where),
      topCarriers: await buildTopCarriers(where),
      recentClaims: recent.map((c) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        title: c.description || c.claimNumber,
        status: c.status,
        amount: c.claimAmount ? Number(c.claimAmount) : 0,
        createdAt: c.createdAt.toISOString(),
      })),
      complianceAlerts,
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

  async exportReport(reportType: string, format: string, query: Record<string, unknown>, corporateId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;

    const dateFilter = parseDateRange(query.dateRange as string);
    if (dateFilter) where.createdAt = dateFilter;

    let reportData: { headers: string[]; rows: unknown[][] };

    switch (reportType) {
      case 'collection-percentage':
        reportData = await generateCollectionPercentage(where);
        break;
      case 'top-customers':
        reportData = await generateTopCustomers(where);
        break;
      case 'top-carriers':
        reportData = await generateTopCarriers(where);
        break;
      case 'metrics-by-carrier':
        reportData = await generateMetricsByCarrier(where);
        break;
      case 'metrics-by-destination':
        reportData = await generateMetricsByDestination(where);
        break;
      case 'write-off':
        reportData = await generateWriteOff(where);
        break;
      case 'aging':
        reportData = await generateAging(where);
        break;
      case 'insurance':
        reportData = await generateInsurance(where);
        break;
      default: {
        const claims = await prisma.claim.findMany({
          where: where as any,
          include: {
            customer: { select: { name: true } },
            parties: { where: { type: 'carrier' }, select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });

        reportData = {
          headers: ['Claim Number', 'PRO Number', 'Status', 'Type', 'Claim Amount', 'Settled Amount', 'Customer', 'Carrier', 'Ship Date', 'Delivery Date', 'Filing Date', 'Created'],
          rows: claims.map((c) => [
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
          ]),
        };
      }
    }

    const csvData = buildCSV(reportData.headers, reportData.rows);
    const ext = getExtension(format);
    const contentType = format === 'csv' ? 'text/csv' : getContentType(format);

    return {
      filename: `${reportType}-${new Date().toISOString().split('T')[0]}.${ext}`,
      contentType,
      data: csvData,
    };
  },
};
