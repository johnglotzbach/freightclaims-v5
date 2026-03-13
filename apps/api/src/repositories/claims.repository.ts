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
  parentClaimId?: string;
}

export const claimsRepository = {
  async findMany(filters: ClaimFilters, pagination: { limit: number; offset: number }) {
    const showDeleted = filters.status === 'deleted';
    const where: Record<string, unknown> = showDeleted
      ? { deletedAt: { not: null } }
      : { deletedAt: null };

    if (filters.corporateId) where.corporateId = filters.corporateId;
    if (filters.status && !showDeleted) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.parentClaimId) where.parentClaimId = filters.parentClaimId;
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
        include: {
          parties: true,
          customer: { select: { name: true } },
        },
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
        identifiers: true,
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

  async restore(id: string) {
    return prisma.claim.update({ where: { id }, data: { deletedAt: null } });
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
  async getComments(claimId: string) {
    return prisma.claimComment.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
  },
  async updateComment(commentId: string, data: Record<string, unknown>) {
    return prisma.claimComment.update({ where: { id: commentId }, data: { ...data, editedAt: new Date() } as any });
  },
  async deleteComment(commentId: string) {
    await prisma.claimComment.deleteMany({ where: { parentId: commentId } });
    return prisma.claimComment.delete({ where: { id: commentId } });
  },
  async pinComment(commentId: string, isPinned: boolean) {
    return prisma.claimComment.update({ where: { id: commentId }, data: { isPinned } });
  },
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

  async deletePayment(_claimId: string, paymentId: string) {
    return prisma.claimPayment.delete({ where: { id: paymentId } });
  },

  async getPaymentSummary(claimId: string) {
    const payments = await prisma.claimPayment.findMany({ where: { claimId } });
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { claimAmount: true, reserveAmount: true },
    });
    const summary: Record<string, { filed: number; inbound: number; outbound: number; concession: number; writeOff: number; directToCustomer: number; balance: number }> = {};
    const parties = await prisma.claimParty.findMany({ where: { claimId }, select: { id: true, name: true, type: true } });
    for (const party of parties) {
      summary[party.id] = { filed: 0, inbound: 0, outbound: 0, concession: 0, writeOff: 0, directToCustomer: 0, balance: 0 };
    }
    let totalInbound = 0, totalOutbound = 0, totalConcession = 0, totalWriteOff = 0, totalDirect = 0;
    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      const partyId = p.claimPartyId || '_unassigned';
      if (!summary[partyId]) summary[partyId] = { filed: 0, inbound: 0, outbound: 0, concession: 0, writeOff: 0, directToCustomer: 0, balance: 0 };
      const txType = (p as any).transactionType || p.type || 'inbound_payment';
      switch (txType) {
        case 'inbound_payment': summary[partyId].inbound += amt; totalInbound += amt; break;
        case 'outbound_payment': summary[partyId].outbound += amt; totalOutbound += amt; break;
        case 'concession': summary[partyId].concession += amt; totalConcession += amt; break;
        case 'write_off': summary[partyId].writeOff += amt; totalWriteOff += amt; break;
        case 'direct_to_customer': summary[partyId].directToCustomer += amt; totalDirect += amt; break;
        default: summary[partyId].inbound += amt; totalInbound += amt;
      }
    }
    for (const key of Object.keys(summary)) {
      const s = summary[key];
      s.balance = s.inbound - s.outbound - s.concession - s.writeOff - s.directToCustomer;
    }
    const filedAmount = Number(claim?.claimAmount) || 0;
    const reserveAmount = Number(claim?.reserveAmount) || 0;
    const fundsAvailable = filedAmount - totalInbound + totalOutbound;
    const hasPending = payments.some((p: any) => (p as any).paymentStatus === 'pending');
    return {
      filedAmount,
      reserveAmount,
      totalInbound,
      totalOutbound,
      totalConcession,
      totalWriteOff,
      totalDirect,
      fundsAvailable,
      hasPendingTransactions: hasPending,
      perParty: summary,
      parties: parties.map(p => ({ id: p.id, name: p.name, type: p.type })),
    };
  },

  async getPaymentsByType(claimId: string, transactionType: string) {
    return prisma.claimPayment.findMany({
      where: { claimId, transactionType } as any,
      orderBy: { createdAt: 'desc' },
    });
  },

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
    const results = { created: 0, errors: [] as string[], total: rows.length };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { corporateId: true, customerId: true } });
    const customerId = user?.customerId || user?.corporateId;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const parseDate = (v: unknown): Date | undefined => {
          if (!v) return undefined;
          const d = new Date(v as string);
          return isNaN(d.getTime()) ? undefined : d;
        };

        const claimNumber = (row.claimNumber as string) ||
          `FC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const claim = await prisma.claim.create({
          data: {
            claimNumber,
            proNumber: (row.proNumber as string) || claimNumber,
            claimType: (row.claimType as string) || 'damage',
            claimAmount: Number(row.claimAmount) || 0,
            description: (row.description as string) || null,
            shipDate: parseDate(row.shipDate),
            deliveryDate: parseDate(row.deliveryDate),
            status: 'draft',
            createdById: userId,
            customerId: customerId || userId,
            corporateId: user?.corporateId || null,
          },
        });

        if (row.carrierName) {
          await prisma.claimParty.create({
            data: { claimId: claim.id, type: 'carrier', name: row.carrierName as string },
          }).catch(() => {});
        }
        if (row.bolNumber) {
          await prisma.claimIdentifier.create({
            data: { claimId: claim.id, type: 'bol', value: row.bolNumber as string },
          }).catch(() => {});
        }

        results.created++;
      } catch (err: any) {
        results.errors.push(`Row ${i + 1}: ${err.message || String(err)}`);
      }
    }

    return results;
  },

  async getMassUploadHistory(customerId?: string) {
    const where: Record<string, unknown> = { status: 'draft' };
    if (customerId) where.customerId = customerId;
    const recentDrafts = await prisma.claim.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, claimNumber: true, proNumber: true, claimAmount: true, createdAt: true, status: true },
    });
    return recentDrafts;
  },

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
