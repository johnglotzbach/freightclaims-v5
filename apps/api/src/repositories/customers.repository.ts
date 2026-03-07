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

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where: where as any, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
      prisma.customer.count({ where: where as any }),
    ]);
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
  async getReports(customerId: string) { void customerId; return []; },
  async getCountries() { return prisma.country.findMany({ orderBy: { name: 'asc' } }); },
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
