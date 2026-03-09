/**
 * ShipmentsRepository - Database queries for shipments, carriers, insurance, suppliers
 *
 * Location: apps/api/src/repositories/shipments.repository.ts
 */
import { prisma } from '../config/database';

export const shipmentsRepository = {
  async findMany(query: Record<string, unknown>, tenantFilter: Record<string, unknown> = {}) {
    const page = Number(query.page) || 1;
    const limit = 25;
    const where = { ...tenantFilter, deletedAt: null };
    const [data, total] = await Promise.all([
      prisma.shipment.findMany({ where: where as any, skip: (page - 1) * limit, take: limit }),
      prisma.shipment.count({ where: where as any }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async findById(id: string) { return prisma.shipment.findUnique({ where: { id }, include: { contacts: true } }); },
  async create(data: Record<string, unknown>) { return prisma.shipment.create({ data: data as any }); },
  async update(id: string, data: Record<string, unknown>) { return prisma.shipment.update({ where: { id }, data: data as any }); },
  async softDelete(id: string) { return prisma.shipment.update({ where: { id }, data: { deletedAt: new Date() } }); },
  async getContacts(shipmentId: string) { return prisma.shipmentContact.findMany({ where: { shipmentId } }); },
  async addContact(shipmentId: string, data: Record<string, unknown>) { return prisma.shipmentContact.create({ data: { ...data, shipmentId } as any }); },
  async listCarriers(query: Record<string, unknown>) { void query; return prisma.carrier.findMany({ orderBy: { name: 'asc' } }); },
  async getCarrier(id: string) { return prisma.carrier.findUnique({ where: { id } }); },
  async createCarrier(data: Record<string, unknown>) {
    const payload: Record<string, unknown> = { name: String(data.name || '') };
    if (data.scacCode) payload.scacCode = String(data.scacCode);
    if (data.dotNumber) payload.dotNumber = String(data.dotNumber);
    if (data.mcNumber) payload.mcNumber = String(data.mcNumber);
    if (data.email) payload.email = String(data.email);
    if (data.phone) payload.phone = String(data.phone);
    if (data.website) payload.website = String(data.website);
    if (data.isInternational !== undefined) payload.isInternational = Boolean(data.isInternational);
    return prisma.carrier.create({ data: payload as any });
  },
  async updateCarrier(id: string, data: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = String(data.name);
    if (data.scacCode !== undefined) payload.scacCode = data.scacCode ? String(data.scacCode) : null;
    if (data.dotNumber !== undefined) payload.dotNumber = data.dotNumber ? String(data.dotNumber) : null;
    if (data.mcNumber !== undefined) payload.mcNumber = data.mcNumber ? String(data.mcNumber) : null;
    if (data.email !== undefined) payload.email = data.email ? String(data.email) : null;
    if (data.phone !== undefined) payload.phone = data.phone ? String(data.phone) : null;
    if (data.website !== undefined) payload.website = data.website ? String(data.website) : null;
    if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive);
    if (data.isInternational !== undefined) payload.isInternational = Boolean(data.isInternational);
    return prisma.carrier.update({ where: { id }, data: payload as any });
  },
  async deleteCarrier(id: string) { return prisma.carrier.delete({ where: { id } }); },
  async getCarrierContacts(carrierId: string) { return prisma.carrierContact.findMany({ where: { carrierId } }); },
  async addCarrierContact(carrierId: string, data: Record<string, unknown>) { return prisma.carrierContact.create({ data: { ...data, carrierId } as any }); },
  async getCarrierData() { return prisma.carrier.findMany({ select: { id: true, name: true, scacCode: true } }); },
  async getIntegratedCarriers() { return prisma.carrierIntegration.findMany({ include: { carrier: true } }); },
  async getIntegratedCarrierKeys(id: string) { return prisma.carrierIntegration.findUnique({ where: { id } }); },
  async getInternationalCarriers() { return prisma.carrier.findMany({ where: { isInternational: true } }); },
  async listInsurances() { return prisma.insurance.findMany(); },
  async getInsurance(id: string) { return prisma.insurance.findUnique({ where: { id } }); },
  async createInsurance(data: Record<string, unknown>) { return prisma.insurance.create({ data: data as any }); },
  async getInsuranceContacts(id: string) { return prisma.insuranceContact.findMany({ where: { insuranceId: id } }); },
  async listSuppliers() { return prisma.supplier.findMany({ orderBy: { name: 'asc' } }); },
  async createSupplier(data: Record<string, unknown>) {
    const payload: Record<string, unknown> = { name: String(data.name ?? '') };
    if (data.email != null) payload.email = String(data.email);
    if (data.phone != null) payload.phone = String(data.phone);
    return prisma.supplier.create({ data: payload as any });
  },
  async updateSupplier(id: string, data: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};
    if (data.name != null) payload.name = String(data.name);
    if (data.email != null) payload.email = String(data.email);
    if (data.phone != null) payload.phone = String(data.phone);
    return prisma.supplier.update({ where: { id }, data: payload as any });
  },
  async deleteSupplier(id: string) { return prisma.supplier.delete({ where: { id } }); },
  async getSupplierAddresses(id: string) { return prisma.supplierAddress.findMany({ where: { supplierId: id } }); },
  /** Bulk-creates shipments from parsed CSV/Excel data */
  async massUpload(data: Record<string, unknown>, corporateId: string | null) {
    const rows = (data.rows as Record<string, unknown>[]) || [];
    const results = { created: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      try {
        await prisma.shipment.create({ data: { ...rows[i], corporateId } as any });
        results.created++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${String(err)}`);
      }
    }

    return results;
  },

  async carriersMassUpload(rows: Record<string, unknown>[], type: string) {
    const results = { created: 0, errors: [] as string[], total: rows.length };

    if (type === 'carriers') {
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          const name = (row.name as string) || (row.CarrierName as string);
          if (!name) { results.errors.push(`Row ${i + 1}: Carrier name is required`); continue; }
          await prisma.carrier.create({
            data: {
              name,
              scacCode: (row.scacCode as string) || undefined,
              dotNumber: (row.dotNumber as string) || undefined,
              mcNumber: (row.mcNumber as string) || undefined,
              email: (row.email as string) || undefined,
              phone: (row.phone as string) || undefined,
            },
          });
          results.created++;
        } catch (err: any) {
          results.errors.push(`Row ${i + 1}: ${err.message || String(err)}`);
        }
      }
    } else if (type === 'carrier-contacts') {
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          const carrierName = (row.name as string) || (row.CarrierName as string);
          if (!carrierName) { results.errors.push(`Row ${i + 1}: Carrier name is required`); continue; }
          const carrier = await prisma.carrier.findFirst({ where: { name: { equals: carrierName, mode: 'insensitive' } } });
          if (!carrier) { results.errors.push(`Row ${i + 1}: Carrier "${carrierName}" not found`); continue; }
          const contactName = [(row.firstName as string) || '', (row.lastName as string) || ''].filter(Boolean).join(' ') || 'Contact';
          await prisma.carrierContact.create({
            data: {
              carrierId: carrier.id,
              name: contactName,
              email: (row.email as string) || undefined,
              phone: (row.phone as string) || undefined,
              title: (row.title as string) || undefined,
            },
          });
          results.created++;
        } catch (err: any) {
          results.errors.push(`Row ${i + 1}: ${err.message || String(err)}`);
        }
      }
    }

    return results;
  },
};
