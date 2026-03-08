/**
 * DocumentsRepository - Database queries for documents and categories
 *
 * Location: apps/api/src/repositories/documents.repository.ts
 */
import { prisma } from '../config/database';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const documentsRepository = {
  async findMany(query: Record<string, unknown>, user?: { corporateId: string | null; isSuperAdmin: boolean }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);
    const where: Record<string, unknown> = {};
    if (query.claimId) where.claimId = query.claimId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (user && !user.isSuperAdmin && user.corporateId) {
      where.OR = [
        { claim: { corporateId: user.corporateId } },
        { claimId: null, uploadedBy: (user as any).userId },
      ];
    }

    let rawDocs: any[];
    let total: number;

    try {
      [rawDocs, total] = await Promise.all([
        prisma.claimDocument.findMany({
          where: where as any,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            claim: { select: { claimNumber: true } },
            category: { select: { name: true } },
          },
        }),
        prisma.claimDocument.count({ where: where as any }),
      ]);
    } catch {
      [rawDocs, total] = await Promise.all([
        prisma.claimDocument.findMany({
          where: {} as any,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, claimId: true, categoryId: true, documentName: true,
            s3Key: true, fileSize: true, mimeType: true, uploadedBy: true,
            aiProcessingStatus: true, createdAt: true,
          },
        }),
        prisma.claimDocument.count({ where: {} }),
      ]);
    }

    const data = rawDocs.map((doc: any) => ({
      id: doc.id,
      name: doc.documentName,
      documentName: doc.documentName,
      category: doc.category?.name || 'Other',
      categoryId: doc.categoryId,
      claimId: doc.claimId,
      claimNumber: doc.claim?.claimNumber || '',
      uploadedBy: doc.uploadedBy,
      date: doc.createdAt,
      size: doc.fileSize ? formatFileSize(doc.fileSize) : '—',
      fileSize: doc.fileSize,
      type: doc.mimeType?.startsWith('image/') ? 'image' : 'pdf',
      mimeType: doc.mimeType,
      s3Key: doc.s3Key,
      aiProcessed: doc.aiProcessingStatus === 'completed',
      aiProcessingStatus: doc.aiProcessingStatus,
      confidence: null,
    }));

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async findById(id: string) {
    return prisma.claimDocument.findUnique({ where: { id } });
  },

  async create(data: Record<string, unknown>) {
    return prisma.claimDocument.create({ data: data as any });
  },

  async update(id: string, data: Record<string, unknown>) {
    return prisma.claimDocument.update({ where: { id }, data: data as any });
  },

  async delete(id: string) {
    return prisma.claimDocument.delete({ where: { id } });
  },

  async getCategories() {
    return prisma.documentCategory.findMany({ orderBy: { name: 'asc' } });
  },

  async createCategory(data: Record<string, unknown>) {
    return prisma.documentCategory.create({ data: data as any });
  },

  async updateCategory(id: string, data: Record<string, unknown>) {
    return prisma.documentCategory.update({ where: { id }, data: data as any });
  },

  async deleteCategory(id: string) {
    return prisma.documentCategory.delete({ where: { id } });
  },

  async getCategoryMapping() {
    return prisma.documentCategoryMapping.findMany({ include: { category: true } });
  },

  async updateCategoryMapping(data: Record<string, unknown>) {
    if (data.id) {
      return prisma.documentCategoryMapping.update({ where: { id: data.id as string }, data: data as any });
    }
    return prisma.documentCategoryMapping.create({ data: data as any });
  },

  async getExtractedData(id: string) {
    return prisma.aiDocument.findFirst({ where: { documentId: id } });
  },
};
