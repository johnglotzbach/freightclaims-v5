/**
 * CustomersRepository - Database queries for customer entities
 *
 * Location: apps/api/src/repositories/customers.repository.ts
 */
import { prisma } from '../config/database';

export const customersRepository = {
  async findMany(query: Record<string, unknown>, corporateId?: string | null, isSuperAdmin = false) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId) where.corporateId = corporateId;
    else if (!isSuperAdmin) where.corporateId = corporateId;
    if (query.type === 'corporate') where.isCorporate = true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search as string, mode: 'insensitive' } },
        { code: { contains: query.search as string, mode: 'insensitive' } },
        { email: { contains: query.search as string, mode: 'insensitive' } },
      ];
    }

    const isCorporateQuery = query.type === 'corporate';

    let customers: any[];
    let total: number;

    try {
      [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where: where as any,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { name: 'asc' },
          ...(isCorporateQuery ? {
            include: {
              _count: { select: { corporateUsers: true, claims: true } },
              corporateUsers: {
                where: { isSuperAdmin: false },
                select: { id: true, firstName: true, lastName: true, email: true, isSuperAdmin: true, isActive: true, lastLoginAt: true, role: { select: { name: true } } },
                orderBy: { createdAt: 'asc' as const },
              },
            },
          } : {}),
        }),
        prisma.customer.count({ where: where as any }),
      ]);
    } catch {
      const fallbackWhere: Record<string, unknown> = { deletedAt: null };
      if (corporateId) fallbackWhere.corporateId = corporateId;
      else if (!isSuperAdmin) fallbackWhere.corporateId = corporateId;

      [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where: fallbackWhere as any,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        prisma.customer.count({ where: fallbackWhere as any }),
      ]);
    }

    return { data: customers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async findById(id: string) { return prisma.customer.findUnique({ where: { id }, include: { contacts: true, addresses: true } }); },
  async create(data: Record<string, unknown>) { return prisma.customer.create({ data: data as any }); },
  async update(id: string, data: Record<string, unknown>) { return prisma.customer.update({ where: { id }, data: data as any }); },
  async softDelete(id: string) { return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } }); },
  async getContacts(customerId: string) { return prisma.customerContact.findMany({ where: { customerId } }); },
  async addContact(customerId: string, data: Record<string, unknown>) { return prisma.customerContact.create({ data: { ...data, customerId } as any }); },
  async updateContact(_customerId: string, contactId: string, data: Record<string, unknown>) { return prisma.customerContact.update({ where: { id: contactId }, data: data as any }); },
  async removeContact(_customerId: string, contactId: string) { return prisma.customerContact.delete({ where: { id: contactId } }); },
  async getAddresses(customerId: string) { return prisma.customerAddress.findMany({ where: { customerId } }); },
  async addAddress(customerId: string, data: Record<string, unknown>) { return prisma.customerAddress.create({ data: { ...data, customerId } as any }); },
  async updateAddress(_customerId: string, addressId: string, data: Record<string, unknown>) { return prisma.customerAddress.update({ where: { id: addressId }, data: data as any }); },
  async removeAddress(_customerId: string, addressId: string) { return prisma.customerAddress.delete({ where: { id: addressId } }); },
  async getNotes(customerId: string) { return prisma.customerNote.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } }); },
  async addNote(customerId: string, data: Record<string, unknown>) { return prisma.customerNote.create({ data: { ...data, customerId } as any }); },
  async getReports(customerId: string) {
    const where = { customerId, deletedAt: null };
    const [stats, recentClaims] = await Promise.all([
      prisma.claim.aggregate({
        where: where as any,
        _count: { _all: true },
        _sum: { claimAmount: true, settledAmount: true },
      }),
      prisma.claim.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, claimNumber: true, status: true, claimAmount: true, createdAt: true },
      }),
    ]);
    return {
      totalClaims: stats._count._all,
      totalClaimAmount: Number(stats._sum.claimAmount ?? 0),
      totalSettledAmount: Number(stats._sum.settledAmount ?? 0),
      recentClaims,
    };
  },
  async getCountries() { return prisma.country.findMany({ orderBy: { name: 'asc' } }); },
  /** Aggregate: all contacts across customers with company name (for tenant) */
  async listAllContacts(corporateId?: string | null, isSuperAdmin = false) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId && !isSuperAdmin) where.corporateId = corporateId;
    const contacts = await prisma.customerContact.findMany({
      where: { customer: where as any },
      include: { customer: { select: { name: true, isCorporate: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return contacts.map((c) => ({
      id: c.id,
      customerId: c.customerId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? '',
      phone: c.phone,
      title: c.title,
      isPrimary: c.isPrimary,
      companyName: c.customer.name,
      companyType: 'customer' as const,
    }));
  },

  /** Aggregate: all addresses across customers (for tenant) */
  async listAllAddresses(corporateId?: string | null, isSuperAdmin = false) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId && !isSuperAdmin) where.corporateId = corporateId;
    const addresses = await prisma.customerAddress.findMany({
      where: { customer: where as any },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return addresses.map((a) => ({
      id: a.id,
      customerId: a.customerId,
      name: a.type === 'shipping' ? 'Shipping' : a.type === 'billing' ? 'Billing' : a.type,
      address1: a.street1,
      address2: a.street2,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode,
      country: a.country,
      customerName: a.customer.name,
      isDefault: a.isPrimary,
    }));
  },

  async listAllProducts(corporateId?: string | null, isSuperAdmin = false) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (corporateId && !isSuperAdmin) where.corporateId = corporateId;
    const products = await prisma.productCatalog.findMany({
      where: { customer: where as any },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => ({
      id: p.id,
      customerId: p.customerId,
      name: p.name,
      sku: p.sku ?? undefined,
      description: p.description ?? undefined,
      value: p.value ? Number(p.value) : undefined,
      weight: p.weight ? Number(p.weight) : undefined,
      customerName: p.customer.name,
    }));
  },

  async addProduct(customerId: string, data: Record<string, unknown>) {
    return prisma.productCatalog.create({
      data: {
        customerId,
        name: data.name as string,
        sku: data.sku as string | undefined,
        description: data.description as string | undefined,
        value: data.value != null ? Number(data.value) : undefined,
        weight: data.weight != null ? Number(data.weight) : undefined,
      } as any,
    });
  },

  async updateProduct(_customerId: string, productId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = String(data.name);
    if (data.sku !== undefined) updateData.sku = data.sku != null ? String(data.sku) : null;
    if (data.description !== undefined) updateData.description = data.description != null ? String(data.description) : null;
    if (data.value !== undefined) updateData.value = data.value != null ? Number(data.value) : null;
    if (data.weight !== undefined) updateData.weight = data.weight != null ? Number(data.weight) : null;
    return prisma.productCatalog.update({
      where: { id: productId },
      data: updateData as any,
    });
  },

  async removeProduct(_customerId: string, productId: string) {
    return prisma.productCatalog.delete({ where: { id: productId } });
  },

  /** Returns address suggestions. Connect to SmartyStreets or Google Places for production use. */
  async addressAutocomplete(query: string) {
    if (!query || query.length < 3) return [];
    const addresses = await prisma.customerAddress.findMany({
      where: {
        OR: [
          { street1: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { zipCode: { startsWith: query } },
        ],
      },
      take: 10,
    });
    return addresses;
  },
};
