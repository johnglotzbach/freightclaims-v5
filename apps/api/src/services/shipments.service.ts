/**
 * ShipmentsService - Shipment, carrier, insurance, and supplier management
 *
 * Location: apps/api/src/services/shipments.service.ts
 * Related: apps/api/src/repositories/shipments.repository.ts
 */
import { shipmentsRepository } from '../repositories/shipments.repository';
import { NotFoundError } from '../utils/errors';
import type { JwtPayload } from '../middleware/auth.middleware';
import { forCorporate } from '../middleware/tenant.middleware';

export const shipmentsService = {
  // --- Shipments (corporateId-scoped) ---
  async list(query: Record<string, unknown>, user: JwtPayload) {
    return shipmentsRepository.findMany(query, forCorporate(user.corporateId, user.isSuperAdmin));
  },

  async getById(id: string, user: JwtPayload) {
    const s = await shipmentsRepository.findById(id);
    if (!s) throw new NotFoundError(`Shipment ${id} not found`);
    if (!user.isSuperAdmin && s.corporateId && s.corporateId !== user.corporateId) {
      throw new NotFoundError(`Shipment ${id} not found`);
    }
    return s;
  },

  async create(data: Record<string, unknown>, user: JwtPayload) {
    return shipmentsRepository.create({ ...data, corporateId: user.corporateId });
  },

  async update(id: string, data: Record<string, unknown>, user: JwtPayload) {
    await this.getById(id, user);
    return shipmentsRepository.update(id, data);
  },

  async delete(id: string, user: JwtPayload) {
    await this.getById(id, user);
    return shipmentsRepository.softDelete(id);
  },

  async getContacts(shipmentId: string, user: JwtPayload) {
    await this.getById(shipmentId, user);
    return shipmentsRepository.getContacts(shipmentId);
  },

  async addContact(shipmentId: string, data: Record<string, unknown>, user: JwtPayload) {
    await this.getById(shipmentId, user);
    return shipmentsRepository.addContact(shipmentId, data);
  },

  // --- Carriers (shared reference data, no corporateId in schema) ---
  async listCarriers(query: Record<string, unknown>, _user: JwtPayload) { return shipmentsRepository.listCarriers(query); },
  async getCarrier(id: string, _user: JwtPayload) { return shipmentsRepository.getCarrier(id); },
  async createCarrier(data: Record<string, unknown>, _user: JwtPayload) { return shipmentsRepository.createCarrier(data); },
  async updateCarrier(id: string, data: Record<string, unknown>, _user: JwtPayload) { return shipmentsRepository.updateCarrier(id, data); },
  async getCarrierContacts(carrierId: string, _user: JwtPayload) { return shipmentsRepository.getCarrierContacts(carrierId); },
  async addCarrierContact(carrierId: string, data: Record<string, unknown>, _user: JwtPayload) { return shipmentsRepository.addCarrierContact(carrierId, data); },
  async getCarrierData(_user: JwtPayload) { return shipmentsRepository.getCarrierData(); },
  async getIntegratedCarriers(_user: JwtPayload) { return shipmentsRepository.getIntegratedCarriers(); },
  async getIntegratedCarrierKeys(id: string, _user: JwtPayload) { return shipmentsRepository.getIntegratedCarrierKeys(id); },
  async getInternationalCarriers(_user: JwtPayload) { return shipmentsRepository.getInternationalCarriers(); },

  // --- Insurance (shared reference data, no corporateId in schema) ---
  async listInsurances(_user: JwtPayload) { return shipmentsRepository.listInsurances(); },
  async getInsurance(id: string, _user: JwtPayload) { return shipmentsRepository.getInsurance(id); },
  async createInsurance(data: Record<string, unknown>, _user: JwtPayload) { return shipmentsRepository.createInsurance(data); },
  async getInsuranceContacts(id: string, _user: JwtPayload) { return shipmentsRepository.getInsuranceContacts(id); },

  // --- Suppliers (shared reference data, no corporateId in schema) ---
  async listSuppliers(_user: JwtPayload) { return shipmentsRepository.listSuppliers(); },
  async createSupplier(data: Record<string, unknown>, _user: JwtPayload) { return shipmentsRepository.createSupplier(data); },
  async updateSupplier(id: string, data: Record<string, unknown>, _user: JwtPayload) { return shipmentsRepository.updateSupplier(id, data); },
  async deleteSupplier(id: string, _user: JwtPayload) { return shipmentsRepository.deleteSupplier(id); },
  async getSupplierAddresses(id: string, _user: JwtPayload) { return shipmentsRepository.getSupplierAddresses(id); },

  async massUpload(data: Record<string, unknown>, user: JwtPayload) {
    return shipmentsRepository.massUpload(data, user.corporateId);
  },
};
