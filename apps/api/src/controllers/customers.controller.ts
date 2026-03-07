/**
 * Customers Controller - Request handling for customer management
 *
 * Location: apps/api/src/controllers/customers.controller.ts
 * Related: apps/api/src/services/customers.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { customersService } from '../services/customers.service';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const customersController = {
  list: asyncHandler(async (req, res) => {
    const result = await customersService.list(req.query);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const customer = await customersService.getById(req.params.id as string);
    res.json(customer);
  }),

  create: asyncHandler(async (req, res) => {
    const customer = await customersService.create(req.body);
    res.status(201).json(customer);
  }),

  update: asyncHandler(async (req, res) => {
    const customer = await customersService.update(req.params.id as string, req.body);
    res.json(customer);
  }),

  delete: asyncHandler(async (req, res) => {
    await customersService.delete(req.params.id as string);
    res.status(204).send();
  }),

  getContacts: asyncHandler(async (req, res) => {
    const contacts = await customersService.getContacts(req.params.id as string);
    res.json(contacts);
  }),

  addContact: asyncHandler(async (req, res) => {
    const contact = await customersService.addContact(req.params.id as string, req.body);
    res.status(201).json(contact);
  }),

  updateContact: asyncHandler(async (req, res) => {
    const contact = await customersService.updateContact(req.params.id as string, req.params.contactId as string, req.body);
    res.json(contact);
  }),

  removeContact: asyncHandler(async (req, res) => {
    await customersService.removeContact(req.params.id as string, req.params.contactId as string);
    res.status(204).send();
  }),

  getAddresses: asyncHandler(async (req, res) => {
    const addresses = await customersService.getAddresses(req.params.id as string);
    res.json(addresses);
  }),

  addAddress: asyncHandler(async (req, res) => {
    const address = await customersService.addAddress(req.params.id as string, req.body);
    res.status(201).json(address);
  }),

  updateAddress: asyncHandler(async (req, res) => {
    const address = await customersService.updateAddress(req.params.id as string, req.params.addressId as string, req.body);
    res.json(address);
  }),

  removeAddress: asyncHandler(async (req, res) => {
    await customersService.removeAddress(req.params.id as string, req.params.addressId as string);
    res.status(204).send();
  }),

  getNotes: asyncHandler(async (req, res) => {
    const notes = await customersService.getNotes(req.params.id as string);
    res.json(notes);
  }),

  addNote: asyncHandler(async (req, res) => {
    const note = await customersService.addNote(req.params.id as string, req.body);
    res.status(201).json(note);
  }),

  getReports: asyncHandler(async (req, res) => {
    const reports = await customersService.getReports(req.params.id as string);
    res.json(reports);
  }),

  getCountries: asyncHandler(async (_req, res) => {
    const countries = await customersService.getCountries();
    res.json(countries);
  }),

  addressAutocomplete: asyncHandler(async (req, res) => {
    const suggestions = await customersService.addressAutocomplete(req.query.q as string);
    res.json(suggestions);
  }),
};
