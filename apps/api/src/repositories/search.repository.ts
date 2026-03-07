/**
 * SearchRepository - Cross-entity search queries
 *
 * Location: apps/api/src/repositories/search.repository.ts
 */
import { prisma } from '../config/database';

export const searchRepository = {
  async universalSearch(query: string, corporateId?: string | null, isSuperAdmin = false) {
    const claimWhere: Record<string, unknown> = {
      OR: [{ claimNumber: { contains: query, mode: 'insensitive' } }, { proNumber: { contains: query, mode: 'insensitive' } }],
    };
    const customerWhere: Record<string, unknown> = { name: { contains: query, mode: 'insensitive' } };

    if (corporateId) {
      claimWhere.corporateId = corporateId;
      customerWhere.corporateId = corporateId;
    } else if (!isSuperAdmin) {
      claimWhere.corporateId = corporateId;
      customerWhere.corporateId = corporateId;
    }

    const [claims, customers, carriers] = await Promise.all([
      prisma.claim.findMany({ where: claimWhere as any, take: 10 }),
      prisma.customer.findMany({ where: customerWhere as any, take: 10 }),
      prisma.carrier.findMany({ where: { OR: [{ name: { contains: query, mode: 'insensitive' } }, { scacCode: { contains: query, mode: 'insensitive' } }] }, take: 10 }),
    ]);
    return { claims, customers, carriers };
  },
  async searchClaims(query: Record<string, unknown>, customerId?: string) { void customerId; void query; return []; },
  async searchCustomers(query: Record<string, unknown>, customerId?: string) { void customerId; void query; return []; },
  async searchCarriers(query: Record<string, unknown>) { void query; return []; },
  async searchShipments(query: Record<string, unknown>, customerId?: string) { void customerId; void query; return []; },
};
