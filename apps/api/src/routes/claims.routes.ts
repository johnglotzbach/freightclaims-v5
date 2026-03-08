/**
 * Claims Routes - All endpoints for freight claim management
 *
 * Covers the full claim lifecycle: creation, updates, status transitions,
 * parties (claimant/carrier/payee), products, comments, tasks, payments,
 * documents, mass upload, and dashboard stats.
 *
 * Location: apps/api/src/routes/claims.routes.ts
 * Related: apps/api/src/controllers/claims.controller.ts
 *          apps/api/src/validators/claims.validators.ts
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { claimsController } from '../controllers/claims.controller';
import {
  createClaimSchema,
  updateClaimSchema,
  listClaimsQuerySchema,
} from '../validators/claims.validators';

export const claimsRouter: Router = Router();

// All claim routes require authentication
claimsRouter.use(authenticate);

// --- Named/static routes (must be before /:id) ---

claimsRouter.get('/', validate(listClaimsQuerySchema, 'query'), claimsController.list);
claimsRouter.post('/', validate(createClaimSchema), claimsController.create);

claimsRouter.get('/dashboard/stats', claimsController.getDashboardStats);

claimsRouter.post('/mass-upload', authorize(['admin', 'manager']), claimsController.massUpload);
claimsRouter.get('/mass-upload/history', claimsController.getMassUploadHistory);

claimsRouter.get('/settings/all', authorize(['admin']), claimsController.getSettings);
claimsRouter.put('/settings', authorize(['admin']), claimsController.updateSettings);

// --- Global tasks (must be before /:id) ---
claimsRouter.get('/tasks', claimsController.getAllTasks);
claimsRouter.post('/tasks', claimsController.createGlobalTask);

// --- Parameterized /:id routes ---

claimsRouter.get('/:id', claimsController.getById);
claimsRouter.put('/:id', validate(updateClaimSchema), claimsController.update);
claimsRouter.delete('/:id', authorize(['admin', 'manager']), claimsController.delete);

// --- Claim status workflow ---
claimsRouter.put('/:id/status', authorize(['admin', 'manager']), claimsController.updateStatus);

// --- Claim parties (claimant, carrier, payee) ---
claimsRouter.get('/:id/parties', claimsController.getParties);
claimsRouter.post('/:id/parties', claimsController.addParty);
claimsRouter.put('/:id/parties/:partyId', claimsController.updateParty);
claimsRouter.delete('/:id/parties/:partyId', claimsController.removeParty);

// --- Claim products / line items ---
claimsRouter.get('/:id/products', claimsController.getProducts);
claimsRouter.post('/:id/products', claimsController.addProduct);
claimsRouter.put('/:id/products/:productId', claimsController.updateProduct);
claimsRouter.delete('/:id/products/:productId', claimsController.removeProduct);

// --- Claim comments / activity log ---
claimsRouter.get('/:id/comments', claimsController.getComments);
claimsRouter.post('/:id/comments', claimsController.addComment);

// --- Claim tasks ---
claimsRouter.get('/:id/tasks', claimsController.getTasks);
claimsRouter.post('/:id/tasks', claimsController.addTask);
claimsRouter.put('/:id/tasks/:taskId', claimsController.updateTask);
claimsRouter.delete('/:id/tasks/:taskId', claimsController.deleteTask);

// --- Claim payments ---
claimsRouter.get('/:id/payments', claimsController.getPayments);
claimsRouter.post('/:id/payments', authorize(['admin', 'manager']), claimsController.addPayment);
claimsRouter.put('/:id/payments/:paymentId', authorize(['admin', 'manager']), claimsController.updatePayment);

// --- Claim custom identifiers ---
claimsRouter.get('/:id/identifiers', claimsController.getIdentifiers);
claimsRouter.post('/:id/identifiers', claimsController.addIdentifier);

// --- Acknowledgement ---
claimsRouter.get('/:id/acknowledgement', claimsController.getAcknowledgement);
claimsRouter.post('/:id/acknowledgement', claimsController.createAcknowledgement);
