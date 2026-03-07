/**
 * Shipments Controller - Request handling for shipments, carriers, insurance, suppliers
 *
 * Location: apps/api/src/controllers/shipments.controller.ts
 * Related: apps/api/src/services/shipments.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { shipmentsService } from '../services/shipments.service';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const shipmentsController = {
  // Shipment CRUD
  list: asyncHandler(async (req, res) => { res.json(await shipmentsService.list(req.query)); }),
  getById: asyncHandler(async (req, res) => { res.json(await shipmentsService.getById(req.params.id as string)); }),
  create: asyncHandler(async (req, res) => { res.status(201).json(await shipmentsService.create(req.body)); }),
  update: asyncHandler(async (req, res) => { res.json(await shipmentsService.update(req.params.id as string, req.body)); }),
  delete: asyncHandler(async (req, res) => { await shipmentsService.delete(req.params.id as string); res.status(204).send(); }),

  // Shipment contacts
  getContacts: asyncHandler(async (req, res) => { res.json(await shipmentsService.getContacts(req.params.id as string)); }),
  addContact: asyncHandler(async (req, res) => { res.status(201).json(await shipmentsService.addContact(req.params.id as string, req.body)); }),

  // Carriers
  listCarriers: asyncHandler(async (req, res) => { res.json(await shipmentsService.listCarriers(req.query)); }),
  getCarrier: asyncHandler(async (req, res) => { res.json(await shipmentsService.getCarrier(req.params.id as string)); }),
  createCarrier: asyncHandler(async (req, res) => { res.status(201).json(await shipmentsService.createCarrier(req.body)); }),
  updateCarrier: asyncHandler(async (req, res) => { res.json(await shipmentsService.updateCarrier(req.params.id as string, req.body)); }),

  // Carrier contacts
  getCarrierContacts: asyncHandler(async (req, res) => { res.json(await shipmentsService.getCarrierContacts(req.params.id as string)); }),
  addCarrierContact: asyncHandler(async (req, res) => { res.status(201).json(await shipmentsService.addCarrierContact(req.params.id as string, req.body)); }),

  // Carrier data
  getCarrierData: asyncHandler(async (_req, res) => { res.json(await shipmentsService.getCarrierData()); }),
  getIntegratedCarriers: asyncHandler(async (_req, res) => { res.json(await shipmentsService.getIntegratedCarriers()); }),
  getIntegratedCarrierKeys: asyncHandler(async (req, res) => { res.json(await shipmentsService.getIntegratedCarrierKeys(req.params.id as string)); }),
  getInternationalCarriers: asyncHandler(async (_req, res) => { res.json(await shipmentsService.getInternationalCarriers()); }),

  // Insurance
  listInsurances: asyncHandler(async (_req, res) => { res.json(await shipmentsService.listInsurances()); }),
  getInsurance: asyncHandler(async (req, res) => { res.json(await shipmentsService.getInsurance(req.params.id as string)); }),
  createInsurance: asyncHandler(async (req, res) => { res.status(201).json(await shipmentsService.createInsurance(req.body)); }),
  getInsuranceContacts: asyncHandler(async (req, res) => { res.json(await shipmentsService.getInsuranceContacts(req.params.id as string)); }),

  // Suppliers
  listSuppliers: asyncHandler(async (_req, res) => { res.json(await shipmentsService.listSuppliers()); }),
  createSupplier: asyncHandler(async (req, res) => { res.status(201).json(await shipmentsService.createSupplier(req.body)); }),
  getSupplierAddresses: asyncHandler(async (req, res) => { res.json(await shipmentsService.getSupplierAddresses(req.params.id as string)); }),

  // Mass upload
  massUpload: asyncHandler(async (req, res) => { res.json(await shipmentsService.massUpload(req.body)); }),
};
