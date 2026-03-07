/**
 * SearchService - Universal cross-entity search
 *
 * Location: apps/api/src/services/search.service.ts
 */
import { searchRepository } from '../repositories/search.repository';
import type { JwtPayload } from '../middleware/auth.middleware';
import type { TenantContext } from '../middleware/tenant.middleware';

export const searchService = {
  async universalSearch(query: string, user: JwtPayload, tenant?: TenantContext) {
    const effectiveCorporateId = tenant?.effectiveCorporateId ?? user.corporateId ?? null;
    const isSuperAdmin = tenant?.isSuperAdmin ?? false;
    return searchRepository.universalSearch(query, isSuperAdmin && !effectiveCorporateId ? null : effectiveCorporateId, isSuperAdmin);
  },
  async searchClaims(query: Record<string, unknown>, user: JwtPayload) { return searchRepository.searchClaims(query, user.customerId ?? undefined); },
  async searchCustomers(query: Record<string, unknown>, user: JwtPayload) { return searchRepository.searchCustomers(query, user.customerId ?? undefined); },
  async searchCarriers(query: Record<string, unknown>) { return searchRepository.searchCarriers(query); },
  async searchShipments(query: Record<string, unknown>, user: JwtPayload) { return searchRepository.searchShipments(query, user.customerId ?? undefined); },
};
