/**
 * Shipments Routes - Shipment, carrier, insurance, and supplier management
 *
 * Covers shipment records, carrier database, carrier integrations (API keys/credentials),
 * international carriers, insurance providers, and supplier management.
 *
 * Location: apps/api/src/routes/shipments.routes.ts
 * Related: apps/api/src/controllers/shipments.controller.ts
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { shipmentsController } from '../controllers/shipments.controller';
import {
  createShipmentSchema,
  updateShipmentSchema,
} from '../validators/shipments.validators';

export const shipmentsRouter: Router = Router();

shipmentsRouter.use(authenticate);

// --- Shipment CRUD ---
shipmentsRouter.get('/', shipmentsController.list);
shipmentsRouter.get('/:id', shipmentsController.getById);
shipmentsRouter.post('/', validate(createShipmentSchema), shipmentsController.create);
shipmentsRouter.put('/:id', validate(updateShipmentSchema), shipmentsController.update);
shipmentsRouter.delete('/:id', shipmentsController.delete);

// --- Shipment contacts ---
shipmentsRouter.get('/:id/contacts', shipmentsController.getContacts);
shipmentsRouter.post('/:id/contacts', shipmentsController.addContact);

// --- Carriers ---
shipmentsRouter.get('/carriers/all', shipmentsController.listCarriers);
shipmentsRouter.get('/carriers/:id', shipmentsController.getCarrier);
shipmentsRouter.post('/carriers', authorize(['admin']), shipmentsController.createCarrier);
shipmentsRouter.put('/carriers/:id', authorize(['admin']), shipmentsController.updateCarrier);

// --- Carrier contacts ---
shipmentsRouter.get('/carriers/:id/contacts', shipmentsController.getCarrierContacts);
shipmentsRouter.post('/carriers/:id/contacts', shipmentsController.addCarrierContact);

// --- Carrier data (SCAC codes, integration keys) ---
shipmentsRouter.get('/carriers/data/scac', shipmentsController.getCarrierData);
shipmentsRouter.get('/carriers/integrated/all', shipmentsController.getIntegratedCarriers);
shipmentsRouter.get('/carriers/integrated/:id/keys', shipmentsController.getIntegratedCarrierKeys);

// --- International carriers ---
shipmentsRouter.get('/carriers/international/all', shipmentsController.getInternationalCarriers);

// --- Insurance ---
shipmentsRouter.get('/insurance/all', shipmentsController.listInsurances);
shipmentsRouter.get('/insurance/:id', shipmentsController.getInsurance);
shipmentsRouter.post('/insurance', shipmentsController.createInsurance);
shipmentsRouter.get('/insurance/:id/contacts', shipmentsController.getInsuranceContacts);

// --- Suppliers ---
shipmentsRouter.get('/suppliers/all', shipmentsController.listSuppliers);
shipmentsRouter.post('/suppliers', shipmentsController.createSupplier);
shipmentsRouter.get('/suppliers/:id/addresses', shipmentsController.getSupplierAddresses);

// --- Mass upload ---
shipmentsRouter.post('/mass-upload', shipmentsController.massUpload);
