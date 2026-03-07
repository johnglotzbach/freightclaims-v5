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
  async searchClaims(query: Record<string, unknown>, corporateId?: string) {
    const q = ((query.q || query.search || query.query || '') as string).trim();
    if (!q) return [];
    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [
        { claimNumber: { contains: q, mode: 'insensitive' } },
        { proNumber: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { status: { contains: q, mode: 'insensitive' } },
        { parties: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ],
    };
    if (corporateId) where.corporateId = corporateId;
    return prisma.claim.findMany({
      where: where as any,
      take: Number(query.limit) || 20,
      orderBy: { createdAt: 'desc' },
      include: { parties: true },
    });
  },

  async searchCustomers(query: Record<string, unknown>, corporateId?: string) {
    const q = ((query.q || query.search || query.query || '') as string).trim();
    if (!q) return [];
    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (corporateId) where.corporateId = corporateId;
    return prisma.customer.findMany({
      where: where as any,
      take: Number(query.limit) || 20,
      orderBy: { name: 'asc' },
    });
  },

  async searchCarriers(query: Record<string, unknown>) {
    const q = ((query.q || query.search || query.query || '') as string).trim();
    if (!q) return [];
    return prisma.carrier.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { scacCode: { contains: q, mode: 'insensitive' } },
          { mcNumber: { contains: q, mode: 'insensitive' } },
          { dotNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: Number(query.limit) || 20,
      orderBy: { name: 'asc' },
    });
  },

  async searchShipments(query: Record<string, unknown>, corporateId?: string) {
    const q = ((query.q || query.search || query.query || '') as string).trim();
    if (!q) return [];
    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [
        { proNumber: { contains: q, mode: 'insensitive' } },
        { bolNumber: { contains: q, mode: 'insensitive' } },
        { originCity: { contains: q, mode: 'insensitive' } },
        { destinationCity: { contains: q, mode: 'insensitive' } },
        { carrier: { name: { contains: q, mode: 'insensitive' } } },
      ],
    };
    if (corporateId) where.corporateId = corporateId;
    return prisma.shipment.findMany({
      where: where as any,
      take: Number(query.limit) || 20,
      orderBy: { createdAt: 'desc' },
      include: { carrier: { select: { name: true, scacCode: true } } },
    });
  },
};
