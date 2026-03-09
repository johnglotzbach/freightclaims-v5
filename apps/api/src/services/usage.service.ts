import { prisma } from '../config/database';
import { logger } from '../utils/logger';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const usageService = {
  async incrementUsage(corporateId: string, type: string, amount = 1): Promise<void> {
    const period = currentPeriod();
    try {
      await prisma.usageRecord.upsert({
        where: { corporateId_type_period: { corporateId, type, period } },
        create: { corporateId, type, period, count: amount },
        update: { count: { increment: amount } },
      });
    } catch (err) {
      logger.warn({ err, corporateId, type }, 'Failed to increment usage');
    }
  },

  async getUsage(corporateId: string, period?: string): Promise<Record<string, number>> {
    const p = period || currentPeriod();
    const records = await prisma.usageRecord.findMany({
      where: { corporateId, period: p },
    });
    const result: Record<string, number> = {};
    for (const r of records) {
      result[r.type] = r.count;
    }
    return result;
  },

  async getUsageWithLimits(corporateId: string) {
    const period = currentPeriod();
    const [usage, customer] = await Promise.all([
      prisma.usageRecord.findMany({ where: { corporateId, period } }),
      prisma.customer.findFirst({ where: { id: corporateId }, select: { planType: true } }),
    ]);

    const planType = (customer as any)?.planType || 'starter';
    let limits: any = null;
    try {
      limits = await prisma.planLimit.findUnique({ where: { planType } });
    } catch { /* table may not exist yet */ }

    const usageMap: Record<string, number> = {};
    for (const r of usage) usageMap[r.type] = r.count;

    return {
      period,
      planType,
      usage: usageMap,
      limits: limits ? {
        maxUsers: limits.maxUsers,
        maxClaims: limits.maxClaims,
        maxAiRequests: limits.maxAiRequests,
        maxDocuments: limits.maxDocuments,
        overagePerClaim: limits.overagePerClaim ? Number(limits.overagePerClaim) : null,
        overagePerAiReq: limits.overagePerAiReq ? Number(limits.overagePerAiReq) : null,
        overagePerDocument: limits.overagePerDocument ? Number(limits.overagePerDocument) : null,
      } : null,
      overages: limits ? {
        claims: Math.max(0, (usageMap.claims || 0) - limits.maxClaims),
        documents: Math.max(0, (usageMap.documents || 0) - limits.maxDocuments),
        ai_requests: Math.max(0, (usageMap.ai_requests || 0) - limits.maxAiRequests),
      } : null,
    };
  },
};
