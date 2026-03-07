/**
 * SearchRepository - Cross-entity search queries
 *
 * Location: apps/api/src/repositories/search.repository.ts
 */
import { prisma } from '../config/database';

export const searchRepository = {
  async universalSearch(query: string, customerId?: string) {
    const searchTerm = `%${query}%`;
    void customerId;
    // Full-text search across claims, customers, carriers, shipments
    const [claims, customers, carriers] = await Promise.all([
      prisma.claim.findMany({ where: { OR: [{ claimNumber: { contains: query, mode: 'insensitive' } }, { proNumber: { contains: query, mode: 'insensitive' } }] }, take: 10 }),
      prisma.customer.findMany({ where: { name: { contains: query, mode: 'insensitive' } }, take: 10 }),
      prisma.carrier.findMany({ where: { OR: [{ name: { contains: query, mode: 'insensitive' } }, { scacCode: { contains: query, mode: 'insensitive' } }] }, take: 10 }),
    ]);
    void searchTerm;
    return { claims, customers, carriers };
  },
  async searchClaims(query: Record<string, unknown>, customerId?: string) { void customerId; void query; return []; },
  async searchCustomers(query: Record<string, unknown>, customerId?: string) { void customerId; void query; return []; },
  async searchCarriers(query: Record<string, unknown>) { void query; return []; },
  async searchShipments(query: Record<string, unknown>, customerId?: string) { void customerId; void query; return []; },
};
