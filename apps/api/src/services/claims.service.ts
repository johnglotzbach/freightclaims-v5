/**
 * ClaimsService - Core business logic for claim lifecycle management
 *
 * Handles creation, updates, status transitions, and deletion of freight claims.
 * Manages related entities: parties, products, comments, tasks, payments, identifiers.
 * All database access goes through the claims repository.
 *
 * Location: apps/api/src/services/claims.service.ts
 * Related: apps/api/src/controllers/claims.controller.ts
 *          apps/api/src/repositories/claims.repository.ts
 *          packages/database/prisma/schema.prisma (Claim model)
 */
import { claimsRepository } from '../repositories/claims.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { JwtPayload } from '../middleware/auth.middleware';
import type { TenantContext } from '../middleware/tenant.middleware';
import { smtpService } from './smtp.service';
import { env } from '../config/env';
import { prisma } from '../config/database';

export const claimsService = {
  /**
   * Lists claims with pagination, filtering by status/customer/date range,
   * and sorting. Respects user's corporate scope -- users only see claims
   * belonging to their customer organization.
   *
   * @param query - Pagination and filter parameters from query string
   * @param user - Authenticated user context (for corporate scoping)
   * @returns Paginated list of claims with total count
   */
  async list(query: Record<string, unknown>, user: JwtPayload, tenant?: TenantContext) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);
    const offset = (page - 1) * limit;

    const effectiveCorporateId = tenant?.effectiveCorporateId ?? user.corporateId ?? null;
    const isSuperAdmin = tenant?.isSuperAdmin ?? false;

    const filters = {
      status: query.status as string | undefined,
      customerId: query.customerId as string | undefined,
      corporateId: isSuperAdmin && !effectiveCorporateId ? undefined : effectiveCorporateId,
      isSuperAdmin,
      search: query.search as string | undefined,
      dateFrom: query.dateFrom as string | undefined,
      dateTo: query.dateTo as string | undefined,
    };

    const [claims, total] = await claimsRepository.findMany(filters, { limit, offset });

    return {
      data: claims,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Retrieves a single claim by ID with all related data (parties, products,
   * comments, documents, timeline). Throws NotFoundError if claim doesn't exist.
   */
  async getById(id: string, user: JwtPayload) {
    const claim = await claimsRepository.findById(id);
    if (!claim) throw new NotFoundError(`Claim ${id} not found`);

    // Corporate scoping -- non-admins can only see their own company's claims
    if (user.role !== 'admin' && claim.customerId !== user.customerId) {
      throw new NotFoundError(`Claim ${id} not found`);
    }

    return claim;
  },

  /** Creates a new claim and logs the creation in the timeline */
  async create(data: Record<string, unknown>, user: JwtPayload) {
    logger.info({ userId: user.userId }, 'Creating new claim');
    const claim = await claimsRepository.create({
      ...data,
      createdById: user.userId,
      customerId: user.customerId,
    });
    return claim;
  },

  /** Updates claim fields. Validates that the claim exists first. */
  async update(id: string, data: Record<string, unknown>, user: JwtPayload) {
    const existing = await this.getById(id, user);
    if (!existing) throw new NotFoundError(`Claim ${id} not found`);
    return claimsRepository.update(id, data);
  },

  /** Soft-deletes a claim by setting the deletedAt timestamp */
  async delete(id: string, user: JwtPayload) {
    await this.getById(id, user);
    return claimsRepository.softDelete(id);
  },

  /**
   * Updates claim status with validation of allowed transitions.
   * For example, a "closed" claim can't go back to "pending" without admin override.
   */
  async updateStatus(id: string, newStatus: string, user: JwtPayload) {
    const claim = await this.getById(id, user);

    // Status transition validation
    const allowedTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['in_review', 'cancelled'],
      in_review: ['approved', 'denied', 'pending'],
      approved: ['in_negotiation', 'settled', 'closed'],
      denied: ['appealed', 'closed'],
      appealed: ['in_review', 'closed'],
      in_negotiation: ['settled', 'closed'],
      settled: ['closed'],
    };

    const allowed = allowedTransitions[claim.status] || [];
    if (!allowed.includes(newStatus) && user.role !== 'admin') {
      throw new BadRequestError(`Cannot transition from ${claim.status} to ${newStatus}`);
    }

    const updated = await claimsRepository.updateStatus(id, newStatus, user.userId);

    const freshClaim = await claimsRepository.findById(id);
    if (freshClaim) {
      const creator = await prisma.user.findUnique({ where: { id: freshClaim.createdById }, select: { email: true, firstName: true } });
      if (creator?.email) {
        await smtpService.sendClaimNotification({
          to: creator.email,
          claimNumber: freshClaim.claimNumber,
          subject: `Status changed to ${newStatus}`,
          body: `Your claim ${freshClaim.claimNumber} has been updated to status: ${newStatus}.`,
          claimUrl: `${env.NEXT_PUBLIC_APP_URL}/claims/${id}`,
        }).catch((err: any) => logger.error({ err, claimId: id }, 'Failed to send status change email'));
      }
    }

    return updated;
  },

  // --- Parties ---
  async getParties(claimId: string) { return claimsRepository.getParties(claimId); },
  async addParty(claimId: string, data: Record<string, unknown>) { return claimsRepository.addParty(claimId, data); },
  async updateParty(claimId: string, partyId: string, data: Record<string, unknown>) { return claimsRepository.updateParty(claimId, partyId, data); },
  async removeParty(claimId: string, partyId: string) { return claimsRepository.removeParty(claimId, partyId); },

  // --- Products ---
  async getProducts(claimId: string) { return claimsRepository.getProducts(claimId); },
  async addProduct(claimId: string, data: Record<string, unknown>) { return claimsRepository.addProduct(claimId, data); },
  async updateProduct(claimId: string, productId: string, data: Record<string, unknown>) { return claimsRepository.updateProduct(claimId, productId, data); },
  async removeProduct(claimId: string, productId: string) { return claimsRepository.removeProduct(claimId, productId); },

  // --- Comments ---
  async getComments(claimId: string) { return claimsRepository.getComments(claimId); },
  async addComment(claimId: string, data: Record<string, unknown>, user: JwtPayload) {
    return claimsRepository.addComment(claimId, { ...data, userId: user.userId });
  },

  // --- Tasks ---
  async getTasks(claimId: string) { return claimsRepository.getTasks(claimId); },
  async addTask(claimId: string, data: Record<string, unknown>, user: JwtPayload) {
    return claimsRepository.addTask(claimId, { ...data, createdById: user.userId });
  },
  async updateTask(claimId: string, taskId: string, data: Record<string, unknown>) { return claimsRepository.updateTask(claimId, taskId, data); },
  async deleteTask(claimId: string, taskId: string) { return claimsRepository.deleteTask(claimId, taskId); },

  // --- Payments ---
  async getPayments(claimId: string) { return claimsRepository.getPayments(claimId); },
  async addPayment(claimId: string, data: Record<string, unknown>) { return claimsRepository.addPayment(claimId, data); },
  async updatePayment(claimId: string, paymentId: string, data: Record<string, unknown>) { return claimsRepository.updatePayment(claimId, paymentId, data); },

  // --- Identifiers ---
  async getIdentifiers(claimId: string) { return claimsRepository.getIdentifiers(claimId); },
  async addIdentifier(claimId: string, data: Record<string, unknown>) { return claimsRepository.addIdentifier(claimId, data); },

  // --- Dashboard ---
  async getDashboardStats(user: JwtPayload, tenant?: TenantContext) {
    const effectiveCorporateId = tenant?.effectiveCorporateId ?? user.corporateId ?? null;
    const isSuperAdmin = tenant?.isSuperAdmin ?? false;
    return claimsRepository.getDashboardStats(
      user.customerId ?? undefined,
      isSuperAdmin && !effectiveCorporateId ? undefined : effectiveCorporateId,
    );
  },

  // --- Mass Upload ---
  async massUpload(data: Record<string, unknown>, user: JwtPayload) { return claimsRepository.massUpload(data, user.userId); },
  async getMassUploadHistory(user: JwtPayload) { return claimsRepository.getMassUploadHistory(user.customerId ?? undefined); },

  // --- Settings ---
  async getSettings() { return claimsRepository.getSettings(); },
  async updateSettings(data: Record<string, unknown>) { return claimsRepository.updateSettings(data); },

  // --- Acknowledgement ---
  async getAcknowledgement(claimId: string) { return claimsRepository.getAcknowledgement(claimId); },
  async createAcknowledgement(claimId: string, data: Record<string, unknown>, user: JwtPayload) {
    return claimsRepository.createAcknowledgement(claimId, { ...data, userId: user.userId });
  },
};
