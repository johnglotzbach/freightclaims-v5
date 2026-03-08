/**
 * ClaimsRepository - Database queries for claim entities
 *
 * All Prisma queries for claims, parties, products, comments, tasks,
 * payments, identifiers, and dashboard stats live here. No business logic.
 *
 * Location: apps/api/src/repositories/claims.repository.ts
 * Related: packages/database/prisma/schema.prisma
 */
import { prisma } from '../config/database';

interface ClaimFilters {
  status?: string;
  customerId?: string;
  corporateId?: string | null;
  isSuperAdmin?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  filedDateFrom?: string;
  filedDateTo?: string;
  hasTasks?: boolean;
  hasOverdueTasks?: boolean;
  unreadEmails?: boolean;
}

export const claimsRepository = {
  async findMany(filters: ClaimFilters, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filters.corporateId) where.corporateId = filters.corporateId;
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.search) {
      where.OR = [
        { claimNumber: { contains: filters.search, mode: 'insensitive' } },
        { proNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
        ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
      };
    }
    if (filters.filedDateFrom || filters.filedDateTo) {
      where.filingDate = {
        ...(filters.filedDateFrom && { gte: new Date(filters.filedDateFrom) }),
        ...(filters.filedDateTo && { lte: new Date(filters.filedDateTo) }),
      };
    }
    if (filters.hasOverdueTasks) {
      where.tasks = {
        some: {
          dueDate: { lt: new Date() },
          status: { not: 'completed' },
        },
      };
    } else if (filters.hasTasks) {
      where.tasks = { some: {} };
    }
    // unreadEmails: EmailLog has no readAt; could be added via Notification or future schema

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where: where as any,
        skip: pagination.offset,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: { parties: true },
      }),
      prisma.claim.count({ where: where as any }),
    ]);

    return [claims, total] as const;
  },

  async findById(id: string) {
    return prisma.claim.findUnique({
      where: { id },
      include: {
        parties: true,
        products: true,
        comments: { orderBy: { createdAt: 'desc' } },
        documents: true,
        timeline: { orderBy: { createdAt: 'desc' } },
        tasks: true,
        payments: true,
      },
    });
  },

  async create(data: Record<string, unknown>) {
    return prisma.claim.create({ data: data as any });
  },

  async update(id: string, data: Record<string, unknown>) {
    return prisma.claim.update({ where: { id }, data: data as any });
  },

  async softDelete(id: string) {
    return prisma.claim.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async updateStatus(id: string, status: string, userId: string) {
    return prisma.$transaction([
      prisma.claim.update({ where: { id }, data: { status } }),
      prisma.claimTimeline.create({ data: { claimId: id, status, changedById: userId } }),
    ]);
  },

  // Parties
  async getParties(claimId: string) { return prisma.claimParty.findMany({ where: { claimId } }); },
  async addParty(claimId: string, data: Record<string, unknown>) { return prisma.claimParty.create({ data: { ...data, claimId } as any }); },
  async updateParty(_claimId: string, partyId: string, data: Record<string, unknown>) { return prisma.claimParty.update({ where: { id: partyId }, data: data as any }); },
  async removeParty(_claimId: string, partyId: string) { return prisma.claimParty.delete({ where: { id: partyId } }); },

  // Products
  async getProducts(claimId: string) { return prisma.claimProduct.findMany({ where: { claimId } }); },
  async addProduct(claimId: string, data: Record<string, unknown>) { return prisma.claimProduct.create({ data: { ...data, claimId } as any }); },
  async updateProduct(_claimId: string, productId: string, data: Record<string, unknown>) { return prisma.claimProduct.update({ where: { id: productId }, data: data as any }); },
  async removeProduct(_claimId: string, productId: string) { return prisma.claimProduct.delete({ where: { id: productId } }); },

  // Comments
  async getComments(claimId: string) { return prisma.claimComment.findMany({ where: { claimId }, orderBy: { createdAt: 'desc' } }); },
  async addComment(claimId: string, data: Record<string, unknown>) { return prisma.claimComment.create({ data: { ...data, claimId } as any }); },

  // Tasks
  async getTasks(claimId: string) { return prisma.claimTask.findMany({ where: { claimId } }); },
  async addTask(claimId: string, data: Record<string, unknown>) { return prisma.claimTask.create({ data: { ...data, claimId } as any }); },
  async updateTask(_claimId: string, taskId: string, data: Record<string, unknown>) { return prisma.claimTask.update({ where: { id: taskId }, data: data as any }); },
  async deleteTask(_claimId: string, taskId: string) { return prisma.claimTask.delete({ where: { id: taskId } }); },

  // Payments
  async getPayments(claimId: string) { return prisma.claimPayment.findMany({ where: { claimId } }); },
  async addPayment(claimId: string, data: Record<string, unknown>) { return prisma.claimPayment.create({ data: { ...data, claimId } as any }); },
  async updatePayment(_claimId: string, paymentId: string, data: Record<string, unknown>) { return prisma.claimPayment.update({ where: { id: paymentId }, data: data as any }); },

  // Identifiers
  async getIdentifiers(claimId: string) { return prisma.claimIdentifier.findMany({ where: { claimId } }); },
  async addIdentifier(claimId: string, data: Record<string, unknown>) { return prisma.claimIdentifier.create({ data: { ...data, claimId } as any }); },

  // Timeline
  async addTimeline(claimId: string, status: string, changedById: string, description?: string) {
    return prisma.claimTimeline.create({ data: { claimId, status, changedById, description } });
  },

  // Dashboard
  async getDashboardStats(customerId?: string, corporateId?: string | null) {
    const where: Record<string, unknown> = { deletedAt: null };
    const deletedWhere: Record<string, unknown> = { deletedAt: { not: null } };
    if (corporateId) {
      where.corporateId = corporateId;
      deletedWhere.corporateId = corporateId;
    }
    if (customerId) {
      where.customerId = customerId;
      deletedWhere.customerId = customerId;
    }
    const [total, pending, inReview, settled, deleted] = await Promise.all([
      prisma.claim.count({ where: where as any }),
      prisma.claim.count({ where: { ...where, status: 'pending' } as any }),
      prisma.claim.count({ where: { ...where, status: 'in_review' } as any }),
      prisma.claim.count({ where: { ...where, status: 'settled' } as any }),
      prisma.claim.count({ where: deletedWhere as any }),
    ]);
    return { total, pending, inReview, settled, deleted };
  },

  /** Bulk-creates claims from a parsed CSV/Excel upload */
  async massUpload(data: Record<string, unknown>, userId: string) {
    const rows = (data.rows as Record<string, unknown>[]) || [];
    const results = { created: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      try {
        await prisma.claim.create({
          data: {
            ...rows[i],
            createdById: userId,
            status: 'draft',
          } as any,
        });
        results.created++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${String(err)}`);
      }
    }

    return results;
  },

  async getMassUploadHistory(_customerId?: string) { return []; },

  // Settings
  async getSettings() { return prisma.claimSetting.findMany(); },

  async updateSettings(data: Record<string, unknown>) {
    const entries = Object.entries(data);
    const results = await Promise.all(
      entries.map(([key, value]) =>
        prisma.claimSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        }),
      ),
    );
    return results;
  },

  // Acknowledgement
  async getAcknowledgement(claimId: string) {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { acknowledgmentDate: true },
    });
    if (!claim?.acknowledgmentDate) return null;

    const timelineEntry = await prisma.claimTimeline.findFirst({
      where: { claimId, status: 'acknowledged' },
      orderBy: { createdAt: 'desc' },
      include: { changedBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return {
      claimId,
      acknowledgedAt: claim.acknowledgmentDate,
      acknowledgedBy: timelineEntry?.changedBy ?? null,
      notes: timelineEntry?.description ?? null,
    };
  },

  async createAcknowledgement(claimId: string, data: Record<string, unknown>) {
    const userId = data.userId as string;
    const notes = (data.notes as string) || 'Claim acknowledged';

    const [claim, timeline] = await prisma.$transaction([
      prisma.claim.update({
        where: { id: claimId },
        data: { acknowledgmentDate: new Date() },
      }),
      prisma.claimTimeline.create({
        data: {
          claimId,
          status: 'acknowledged',
          description: notes,
          changedById: userId,
        },
      }),
    ]);

    return {
      claimId: claim.id,
      acknowledgedAt: claim.acknowledgmentDate,
      timelineId: timeline.id,
      notes,
    };
  },
};
