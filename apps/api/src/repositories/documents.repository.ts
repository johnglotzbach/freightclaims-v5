/**
 * DocumentsRepository - Database queries for documents and categories
 *
 * Location: apps/api/src/repositories/documents.repository.ts
 */
import { prisma } from '../config/database';

export const documentsRepository = {
  async findMany(query: Record<string, unknown>) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);
    const where: Record<string, unknown> = {};
    if (query.claimId) where.claimId = query.claimId;
    if (query.categoryId) where.categoryId = query.categoryId;

    const [data, total] = await Promise.all([
      prisma.claimDocument.findMany({ where: where as any, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.claimDocument.count({ where: where as any }),
    ]);
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
