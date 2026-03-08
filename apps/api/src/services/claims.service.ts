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
      filedDateFrom: query.filedDateFrom as string | undefined,
      filedDateTo: query.filedDateTo as string | undefined,
      hasTasks: query.hasTasks === true,
      hasOverdueTasks: query.hasOverdueTasks === true,
      unreadEmails: query.unreadEmails === true,
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

  /** Creates a new claim with parties, products, and identifiers */
  async create(data: Record<string, unknown>, user: JwtPayload) {
    logger.info({ userId: user.userId }, 'Creating new claim');

    const parties = Array.isArray(data.parties) ? data.parties as Record<string, unknown>[] : [];
    const products = Array.isArray(data.products) ? data.products as Record<string, unknown>[] : [];

    const claimNumber = (data.claimNumber as string) ||
      `FC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    let proNumber = data.proNumber as string || '';
    if (!proNumber && data.primaryIdentifier) {
      proNumber = data.primaryIdentifier as string;
    }
    if (!proNumber) proNumber = claimNumber;

    const parseDate = (v: unknown): Date | undefined => {
      if (!v) return undefined;
      const d = new Date(v as string);
      return isNaN(d.getTime()) ? undefined : d;
    };

    const claimFields: Record<string, unknown> = {
      claimNumber,
      proNumber,
      status: (data.status as string) || 'draft',
      claimType: data.claimType as string,
      claimAmount: Number(data.claimAmount) || 0,
      description: data.description || data.note || null,
      shipDate: parseDate(data.shipDate),
      deliveryDate: parseDate(data.deliveryDate),
      filingDate: parseDate(data.filingDate),
      corporateId: user.corporateId || null,
      customerId: user.customerId || user.userId,
      createdById: user.userId,
    };

    const claim = await claimsRepository.create(claimFields);

    const identifiers: { type: string; value: string }[] = [];
    if (data.bolNumber) identifiers.push({ type: 'bol', value: data.bolNumber as string });
    if (data.poNumber) identifiers.push({ type: 'po', value: data.poNumber as string });
    if (data.referenceNumber) identifiers.push({ type: 'reference', value: data.referenceNumber as string });

    const promises: Promise<unknown>[] = [];

    for (const party of parties) {
      promises.push(claimsRepository.addParty(claim.id, {
        type: party.type || 'carrier',
        name: party.name || '',
        email: party.email || null,
        phone: party.phone || null,
        address: party.address || null,
        city: party.city || null,
        state: party.state || null,
        zipCode: party.zipCode || null,
        scacCode: party.scacCode || null,
      }));
    }

    for (const product of products) {
      promises.push(claimsRepository.addProduct(claim.id, {
        description: product.description || product.productName || 'Item',
        quantity: Number(product.quantity) || 1,
        weight: product.weight ? Number(product.weight) : null,
        value: product.value || product.cost ? Number(product.value || product.cost) : null,
        damageType: product.damageType || product.claimCondition || null,
      }));
    }

    for (const ident of identifiers) {
      promises.push(claimsRepository.addIdentifier(claim.id, ident));
    }

    promises.push(claimsRepository.addTimeline(claim.id, 'draft', user.userId, 'Claim created'));

    await Promise.allSettled(promises);

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
  async getAllTasks(user: JwtPayload) {
    const where: Record<string, unknown> = {};
    if (!user.isSuperAdmin && user.corporateId) {
      where.claim = { corporateId: user.corporateId };
    }
    return prisma.claimTask.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        claim: { select: { id: true, claimNumber: true } },
      },
    });
  },
  async createGlobalTask(data: Record<string, unknown>, user: JwtPayload) {
    return prisma.claimTask.create({
      data: {
        claimId: data.claimId as string,
        title: data.title as string,
        description: (data.description as string) || '',
        priority: (data.priority as string) || 'medium',
        status: 'pending',
        dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
        assignedToId: (data.assignedToId as string) || null,
        createdById: user.userId,
      } as any,
    });
  },
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
  async getSettings(_user: JwtPayload) { return claimsRepository.getSettings(); },
  async updateSettings(data: Record<string, unknown>, _user: JwtPayload) { return claimsRepository.updateSettings(data); },

  // --- Acknowledgement ---
  async getAcknowledgement(claimId: string) { return claimsRepository.getAcknowledgement(claimId); },
  async createAcknowledgement(claimId: string, data: Record<string, unknown>, user: JwtPayload) {
    return claimsRepository.createAcknowledgement(claimId, { ...data, userId: user.userId });
  },
};
