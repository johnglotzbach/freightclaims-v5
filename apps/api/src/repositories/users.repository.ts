/**
 * UsersRepository - Database queries for users, roles, permissions, and templates
 *
 * Location: apps/api/src/repositories/users.repository.ts
 */
import { prisma } from '../config/database';

export const usersRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
  },
  async create(data: Record<string, unknown>) { return prisma.user.create({ data: data as any }); },
  async update(id: string, data: Record<string, unknown>) { return prisma.user.update({ where: { id }, data: data as any }); },
  async softDelete(id: string) { return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }); },
  async findMany(query: Record<string, unknown>) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);
    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count(),
    ]);
    return { data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async getPreferences(userId: string) { return prisma.userPreference.findUnique({ where: { userId } }); },
  async updatePreferences(userId: string, data: Record<string, unknown>) { return prisma.userPreference.upsert({ where: { userId }, update: data as any, create: { userId, ...data } as any }); },
  async getRoles() { return prisma.role.findMany(); },
  async createRole(data: Record<string, unknown>) { return prisma.role.create({ data: data as any }); },
  async updateRole(id: string, data: Record<string, unknown>) { return prisma.role.update({ where: { id }, data: data as any }); },
  async getPermissions() { return prisma.permission.findMany(); },
  async updatePermission(id: string, data: Record<string, unknown>) { return prisma.permission.update({ where: { id }, data: data as any }); },
  async getEmailTemplates() { return prisma.emailTemplate.findMany(); },
  async createEmailTemplate(data: Record<string, unknown>) { return prisma.emailTemplate.create({ data: data as any }); },
  async updateEmailTemplate(id: string, data: Record<string, unknown>) { return prisma.emailTemplate.update({ where: { id }, data: data as any }); },
  async getLetterTemplates() { return prisma.letterTemplate.findMany(); },
  async createLetterTemplate(data: Record<string, unknown>) { return prisma.letterTemplate.create({ data: data as any }); },
  async updateLetterTemplate(id: string, data: Record<string, unknown>) { return prisma.letterTemplate.update({ where: { id }, data: data as any }); },
};
