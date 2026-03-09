/**
 * Shipments Controller - Request handling for shipments, carriers, insurance, suppliers
 *
 * Location: apps/api/src/controllers/shipments.controller.ts
 * Related: apps/api/src/services/shipments.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { shipmentsService } from '../services/shipments.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const shipmentsController = {
  // Shipment CRUD
  list: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.list(req.query, user)); }),
  getById: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getById(req.params.id as string, user)); }),
  create: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await shipmentsService.create(req.body, user)); }),
  update: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.update(req.params.id as string, req.body, user)); }),
  delete: asyncHandler(async (req, res) => { const user = getUser(req); await shipmentsService.delete(req.params.id as string, user); res.status(204).send(); }),

  // Shipment contacts
  getContacts: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getContacts(req.params.id as string, user)); }),
  addContact: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await shipmentsService.addContact(req.params.id as string, req.body, user)); }),

  // Carriers
  listCarriers: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.listCarriers(req.query, user)); }),
  getCarrier: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getCarrier(req.params.id as string, user)); }),
  createCarrier: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await shipmentsService.createCarrier(req.body, user)); }),
  updateCarrier: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.updateCarrier(req.params.id as string, req.body, user)); }),
  deleteCarrier: asyncHandler(async (req, res) => { const user = getUser(req); await shipmentsService.deleteCarrier(req.params.id as string, user); res.status(204).send(); }),

  // Carrier contacts
  getCarrierContacts: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getCarrierContacts(req.params.id as string, user)); }),
  addCarrierContact: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await shipmentsService.addCarrierContact(req.params.id as string, req.body, user)); }),

  // Carrier data
  getCarrierData: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getCarrierData(user)); }),
  getIntegratedCarriers: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getIntegratedCarriers(user)); }),
  getIntegratedCarrierKeys: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getIntegratedCarrierKeys(req.params.id as string, user)); }),
  getInternationalCarriers: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getInternationalCarriers(user)); }),

  // Insurance
  listInsurances: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.listInsurances(user)); }),
  getInsurance: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getInsurance(req.params.id as string, user)); }),
  createInsurance: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await shipmentsService.createInsurance(req.body, user)); }),
  getInsuranceContacts: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getInsuranceContacts(req.params.id as string, user)); }),

  // Suppliers
  listSuppliers: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.listSuppliers(user)); }),
  createSupplier: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await shipmentsService.createSupplier(req.body, user)); }),
  updateSupplier: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.updateSupplier(req.params.id as string, req.body, user)); }),
  deleteSupplier: asyncHandler(async (req, res) => { const user = getUser(req); await shipmentsService.deleteSupplier(req.params.id as string, user); res.status(204).send(); }),
  getSupplierAddresses: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.getSupplierAddresses(req.params.id as string, user)); }),

  // Mass upload
  massUpload: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await shipmentsService.massUpload(req.body, user)); }),

  carriersMassUpload: asyncHandler(async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    const uploadType = req.body?.type || 'carriers';

    let rows: Record<string, unknown>[] = [];

    if (file) {
      const csvText = file.buffer.toString('utf-8');
      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        res.status(400).json({ error: 'CSV must have a header row and at least one data row' });
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const headerMap: Record<string, string> = {
        'carrier name': 'name', 'scac code': 'scacCode', 'dot number': 'dotNumber',
        'mc number': 'mcNumber', 'email': 'email', 'phone': 'phone',
        'address': 'address', 'city': 'city', 'state': 'state', 'zip': 'zip',
        'first name': 'firstName', 'last name': 'lastName',
        'title': 'title', 'department': 'department',
      };

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          const key = headerMap[h.toLowerCase()] || h.replace(/\s+/g, '');
          if (values[idx]) row[key] = values[idx];
        });
        if (Object.keys(row).length > 0) rows.push(row);
      }
    } else if (req.body?.rows) {
      rows = req.body.rows;
    }

    if (rows.length === 0) {
      res.status(400).json({ error: 'No data rows found' });
      return;
    }

    const result = await shipmentsService.carriersMassUpload(rows, uploadType);
    res.json(result);
  }),
};
