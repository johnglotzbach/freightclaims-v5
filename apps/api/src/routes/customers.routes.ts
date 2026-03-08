/**
 * Customers Routes - Customer organization and contact management
 *
 * CRUD for customer companies, their contacts, addresses, and notes.
 * Customers are the top-level organizational unit -- each customer has
 * users, claims, shipments, and their own settings.
 *
 * Location: apps/api/src/routes/customers.routes.ts
 * Related: apps/api/src/controllers/customers.controller.ts
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { customersController } from '../controllers/customers.controller';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from '../validators/customers.validators';

export const customersRouter: Router = Router();

customersRouter.use(authenticate);

// --- Customer CRUD ---
customersRouter.get('/', validate(listCustomersQuerySchema, 'query'), customersController.list);

// --- Aggregate lists (must be before /:id) ---
customersRouter.get('/products', customersController.listProducts);
customersRouter.get('/contacts', customersController.listContacts);
customersRouter.get('/locations', customersController.listLocations);
customersRouter.post('/products', customersController.createProduct);
customersRouter.put('/products/:id', customersController.updateProduct);
customersRouter.delete('/products/:id', customersController.deleteProduct);

// --- Lookups (must be before /:id) ---
customersRouter.get('/lookup/countries', customersController.getCountries);
customersRouter.get('/lookup/address-autocomplete', customersController.addressAutocomplete);

customersRouter.get('/:id', customersController.getById);
customersRouter.post('/', authorize(['admin']), validate(createCustomerSchema), customersController.create);
customersRouter.put('/:id', authorize(['admin', 'manager']), validate(updateCustomerSchema), customersController.update);
customersRouter.delete('/:id', authorize(['admin']), customersController.delete);

// --- Customer contacts ---
customersRouter.get('/:id/contacts', customersController.getContacts);
customersRouter.post('/:id/contacts', customersController.addContact);
customersRouter.put('/:id/contacts/:contactId', customersController.updateContact);
customersRouter.delete('/:id/contacts/:contactId', customersController.removeContact);

// --- Customer addresses ---
customersRouter.get('/:id/addresses', customersController.getAddresses);
customersRouter.post('/:id/addresses', customersController.addAddress);
customersRouter.put('/:id/addresses/:addressId', customersController.updateAddress);
customersRouter.delete('/:id/addresses/:addressId', customersController.removeAddress);

// --- Customer notes ---
customersRouter.get('/:id/notes', customersController.getNotes);
customersRouter.post('/:id/notes', customersController.addNote);

// --- Customer reports ---
customersRouter.get('/:id/reports', customersController.getReports);

