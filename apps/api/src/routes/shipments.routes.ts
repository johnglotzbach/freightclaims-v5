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

// --- Named/static routes (must be before /:id) ---

shipmentsRouter.get('/', shipmentsController.list);
shipmentsRouter.post('/', validate(createShipmentSchema), shipmentsController.create);

// --- Carriers ---
shipmentsRouter.get('/carriers/all', shipmentsController.listCarriers);
shipmentsRouter.get('/carriers/data/scac', shipmentsController.getCarrierData);
shipmentsRouter.get('/carriers/integrated/all', shipmentsController.getIntegratedCarriers);
shipmentsRouter.get('/carriers/international/all', shipmentsController.getInternationalCarriers);
shipmentsRouter.post('/carriers', authorize(['admin', 'manager']), shipmentsController.createCarrier);
shipmentsRouter.get('/carriers/:id', shipmentsController.getCarrier);
shipmentsRouter.put('/carriers/:id', authorize(['admin', 'manager']), shipmentsController.updateCarrier);
shipmentsRouter.delete('/carriers/:id', authorize(['admin', 'manager']), shipmentsController.deleteCarrier);
shipmentsRouter.get('/carriers/:id/contacts', shipmentsController.getCarrierContacts);
shipmentsRouter.post('/carriers/:id/contacts', shipmentsController.addCarrierContact);
shipmentsRouter.get('/carriers/integrated/:id/keys', shipmentsController.getIntegratedCarrierKeys);

// --- Insurance ---
shipmentsRouter.get('/insurance/all', shipmentsController.listInsurances);
shipmentsRouter.post('/insurance', shipmentsController.createInsurance);
shipmentsRouter.get('/insurance/:id', shipmentsController.getInsurance);
shipmentsRouter.get('/insurance/:id/contacts', shipmentsController.getInsuranceContacts);

// --- Suppliers ---
shipmentsRouter.get('/suppliers/all', shipmentsController.listSuppliers);
shipmentsRouter.post('/suppliers', shipmentsController.createSupplier);
shipmentsRouter.put('/suppliers/:id', shipmentsController.updateSupplier);
shipmentsRouter.delete('/suppliers/:id', shipmentsController.deleteSupplier);
shipmentsRouter.get('/suppliers/:id/addresses', shipmentsController.getSupplierAddresses);

// --- Mass upload ---
shipmentsRouter.post('/mass-upload', authorize(['admin', 'manager']), shipmentsController.massUpload);

// --- Parameterized /:id routes ---

shipmentsRouter.get('/:id', shipmentsController.getById);
shipmentsRouter.put('/:id', validate(updateShipmentSchema), shipmentsController.update);
shipmentsRouter.delete('/:id', authorize(['admin', 'manager']), shipmentsController.delete);
shipmentsRouter.get('/:id/contacts', shipmentsController.getContacts);
shipmentsRouter.post('/:id/contacts', shipmentsController.addContact);
