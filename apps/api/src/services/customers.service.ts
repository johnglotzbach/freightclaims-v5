/**
 * CustomersService - Customer organization management
 *
 * Location: apps/api/src/services/customers.service.ts
 * Related: apps/api/src/repositories/customers.repository.ts
 */
import { customersRepository } from '../repositories/customers.repository';
import { NotFoundError } from '../utils/errors';

export const customersService = {
  async list(query: Record<string, unknown>, corporateId?: string | null, isSuperAdmin = false) {
    return customersRepository.findMany(query, corporateId, isSuperAdmin);
  },

  async getById(id: string) {
    const customer = await customersRepository.findById(id);
    if (!customer) throw new NotFoundError(`Customer ${id} not found`);
    return customer;
  },

  async create(data: Record<string, unknown>) { return customersRepository.create(data); },
  async update(id: string, data: Record<string, unknown>) { await this.getById(id); return customersRepository.update(id, data); },
  async delete(id: string) { await this.getById(id); return customersRepository.softDelete(id); },

  async getContacts(customerId: string) { return customersRepository.getContacts(customerId); },
  async addContact(customerId: string, data: Record<string, unknown>) { return customersRepository.addContact(customerId, data); },
  async updateContact(customerId: string, contactId: string, data: Record<string, unknown>) { return customersRepository.updateContact(customerId, contactId, data); },
  async removeContact(customerId: string, contactId: string) { return customersRepository.removeContact(customerId, contactId); },

  async getAddresses(customerId: string) { return customersRepository.getAddresses(customerId); },
  async addAddress(customerId: string, data: Record<string, unknown>) { return customersRepository.addAddress(customerId, data); },
  async updateAddress(customerId: string, addressId: string, data: Record<string, unknown>) { return customersRepository.updateAddress(customerId, addressId, data); },
  async removeAddress(customerId: string, addressId: string) { return customersRepository.removeAddress(customerId, addressId); },

  async getNotes(customerId: string) { return customersRepository.getNotes(customerId); },
  async addNote(customerId: string, data: Record<string, unknown>) { return customersRepository.addNote(customerId, data); },

  async listAllContacts(corporateId?: string | null, isSuperAdmin = false) { return customersRepository.listAllContacts(corporateId, isSuperAdmin); },
  async listAllAddresses(corporateId?: string | null, isSuperAdmin = false) { return customersRepository.listAllAddresses(corporateId, isSuperAdmin); },
  async listAllProducts(corporateId?: string | null, isSuperAdmin = false) { return customersRepository.listAllProducts(corporateId, isSuperAdmin); },
  async addProduct(customerId: string, data: Record<string, unknown>) { return customersRepository.addProduct(customerId, data); },
  async updateProduct(customerId: string, productId: string, data: Record<string, unknown>) { return customersRepository.updateProduct(customerId, productId, data); },
  async removeProduct(customerId: string, productId: string) { return customersRepository.removeProduct(customerId, productId); },

  async getReports(customerId: string) { return customersRepository.getReports(customerId); },
  async getCountries() { return customersRepository.getCountries(); },
  async addressAutocomplete(query: string) { return customersRepository.addressAutocomplete(query); },
};
