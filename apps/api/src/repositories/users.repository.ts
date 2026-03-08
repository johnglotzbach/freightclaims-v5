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
        corporate: {
          select: { id: true, name: true, code: true },
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
        corporate: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  },
  async create(data: Record<string, unknown>) { return prisma.user.create({ data: data as any }); },
  async update(id: string, data: Record<string, unknown>) { return prisma.user.update({ where: { id }, data: data as any }); },
  async softDelete(id: string) { return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }); },
  async findMany(query: Record<string, unknown>, corporateId?: string | null, isSuperAdmin = false) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);
    const where: Record<string, unknown> = {};
    if (corporateId) where.corporateId = corporateId;
    else if (!isSuperAdmin) where.corporateId = corporateId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          role: { select: { id: true, name: true } },
          corporate: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where: where as any }),
    ]);
    const safeUsers = users.map(({ passwordHash: _pw, ...u }) => ({
      ...u,
      role: (u.role as any)?.name || 'User',
      corporateName: (u.corporate as any)?.name || null,
    }));
    return { data: safeUsers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async getPreferences(userId: string) { return prisma.userPreference.findUnique({ where: { userId } }); },
  async updatePreferences(userId: string, data: Record<string, unknown>) { return prisma.userPreference.upsert({ where: { userId }, update: data as any, create: { userId, ...data } as any }); },
  async getRoles() {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: { select: { name: true } } } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      isSystem: r.name === 'Super Admin' || r.name === 'Admin',
      userCount: r._count?.users || 0,
      permissions: r.permissions?.map((rp: any) => rp.permission?.name).filter(Boolean) || [],
    }));
  },
  async createRole(data: Record<string, unknown>) {
    const permissions = Array.isArray(data.permissions) ? data.permissions as string[] : [];
    const role = await prisma.role.create({
      data: {
        name: data.name as string,
        description: (data.description as string) || '',
      },
    });
    if (permissions.length > 0) {
      const permRecords = await prisma.permission.findMany({ where: { name: { in: permissions } } });
      if (permRecords.length > 0) {
        await prisma.rolePermission.createMany({
          data: permRecords.map((p: any) => ({ roleId: role.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
    }
    return role;
  },
  async updateRole(id: string, data: Record<string, unknown>) {
    const permissions = Array.isArray(data.permissions) ? data.permissions as string[] : undefined;
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = String(data.name);
    if (data.description !== undefined) updateData.description = String(data.description);
    const role = await prisma.role.update({
      where: { id },
      data: updateData as any,
    });
    if (permissions !== undefined) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length > 0) {
        const permRecords = await prisma.permission.findMany({ where: { name: { in: permissions } } });
        if (permRecords.length > 0) {
          await prisma.rolePermission.createMany({
            data: permRecords.map((p: any) => ({ roleId: id, permissionId: p.id })),
            skipDuplicates: true,
          });
        }
      }
    }
    return role;
  },
  async deleteRole(id: string) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    return prisma.role.delete({ where: { id } });
  },
  async getPermissions() { return prisma.permission.findMany(); },
  async updatePermission(id: string, data: Record<string, unknown>) { return prisma.permission.update({ where: { id }, data: data as any }); },
  async getEmailTemplates() { return prisma.emailTemplate.findMany(); },
  async createEmailTemplate(data: Record<string, unknown>) { return prisma.emailTemplate.create({ data: data as any }); },
  async updateEmailTemplate(id: string, data: Record<string, unknown>) { return prisma.emailTemplate.update({ where: { id }, data: data as any }); },
  async getLetterTemplates() { return prisma.letterTemplate.findMany(); },
  async createLetterTemplate(data: Record<string, unknown>) { return prisma.letterTemplate.create({ data: data as any }); },
  async updateLetterTemplate(id: string, data: Record<string, unknown>) { return prisma.letterTemplate.update({ where: { id }, data: data as any }); },
  async deleteEmailTemplate(id: string) { return prisma.emailTemplate.delete({ where: { id } }); },
  async deleteLetterTemplate(id: string) { return prisma.letterTemplate.delete({ where: { id } }); },
};
