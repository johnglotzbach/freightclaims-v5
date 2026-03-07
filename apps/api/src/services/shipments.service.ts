/**
 * ShipmentsService - Shipment, carrier, insurance, and supplier management
 *
 * Location: apps/api/src/services/shipments.service.ts
 * Related: apps/api/src/repositories/shipments.repository.ts
 */
import { shipmentsRepository } from '../repositories/shipments.repository';
import { NotFoundError } from '../utils/errors';

export const shipmentsService = {
  async list(query: Record<string, unknown>) { return shipmentsRepository.findMany(query); },
  async getById(id: string) { const s = await shipmentsRepository.findById(id); if (!s) throw new NotFoundError(`Shipment ${id} not found`); return s; },
  async create(data: Record<string, unknown>) { return shipmentsRepository.create(data); },
  async update(id: string, data: Record<string, unknown>) { return shipmentsRepository.update(id, data); },
  async delete(id: string) { return shipmentsRepository.softDelete(id); },
  async getContacts(shipmentId: string) { return shipmentsRepository.getContacts(shipmentId); },
  async addContact(shipmentId: string, data: Record<string, unknown>) { return shipmentsRepository.addContact(shipmentId, data); },
  async listCarriers(query: Record<string, unknown>) { return shipmentsRepository.listCarriers(query); },
  async getCarrier(id: string) { return shipmentsRepository.getCarrier(id); },
  async createCarrier(data: Record<string, unknown>) { return shipmentsRepository.createCarrier(data); },
  async updateCarrier(id: string, data: Record<string, unknown>) { return shipmentsRepository.updateCarrier(id, data); },
  async getCarrierContacts(carrierId: string) { return shipmentsRepository.getCarrierContacts(carrierId); },
  async addCarrierContact(carrierId: string, data: Record<string, unknown>) { return shipmentsRepository.addCarrierContact(carrierId, data); },
  async getCarrierData() { return shipmentsRepository.getCarrierData(); },
  async getIntegratedCarriers() { return shipmentsRepository.getIntegratedCarriers(); },
  async getIntegratedCarrierKeys(id: string) { return shipmentsRepository.getIntegratedCarrierKeys(id); },
  async getInternationalCarriers() { return shipmentsRepository.getInternationalCarriers(); },
  async listInsurances() { return shipmentsRepository.listInsurances(); },
  async getInsurance(id: string) { return shipmentsRepository.getInsurance(id); },
  async createInsurance(data: Record<string, unknown>) { return shipmentsRepository.createInsurance(data); },
  async getInsuranceContacts(id: string) { return shipmentsRepository.getInsuranceContacts(id); },
  async listSuppliers() { return shipmentsRepository.listSuppliers(); },
  async createSupplier(data: Record<string, unknown>) { return shipmentsRepository.createSupplier(data); },
  async getSupplierAddresses(id: string) { return shipmentsRepository.getSupplierAddresses(id); },
  async massUpload(data: Record<string, unknown>) { return shipmentsRepository.massUpload(data); },
};
