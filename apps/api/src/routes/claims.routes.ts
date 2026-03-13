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
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { claimsController } from '../controllers/claims.controller';
import {
  createClaimSchema,
  updateClaimSchema,
  listClaimsQuerySchema,
} from '../validators/claims.validators';

const massUploadMulter = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const claimsRouter: Router = Router();

// All claim routes require authentication
claimsRouter.use(authenticate);

// --- Named/static routes (must be before /:id) ---

claimsRouter.get('/', validate(listClaimsQuerySchema, 'query'), claimsController.list);
claimsRouter.post('/', validate(createClaimSchema), claimsController.create);

claimsRouter.get('/dashboard/stats', claimsController.getDashboardStats);

claimsRouter.post('/mass-upload', authorize(['admin', 'manager']), massUploadMulter.single('file'), claimsController.massUpload);
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
claimsRouter.post('/:id/restore', authorize(['admin', 'manager']), claimsController.restore);

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

// --- Claim activity log ---
claimsRouter.get('/:id/activity', claimsController.getActivity);

// --- Claim comments / activity log ---
claimsRouter.get('/:id/comments', claimsController.getComments);
claimsRouter.post('/:id/comments', claimsController.addComment);
claimsRouter.put('/:id/comments/:commentId', claimsController.updateComment);
claimsRouter.delete('/:id/comments/:commentId', claimsController.deleteComment);
claimsRouter.post('/:id/comments/:commentId/pin', claimsController.pinComment);

// --- Claim tasks ---
claimsRouter.get('/:id/tasks', claimsController.getTasks);
claimsRouter.post('/:id/tasks', claimsController.addTask);
claimsRouter.put('/:id/tasks/:taskId', claimsController.updateTask);
claimsRouter.delete('/:id/tasks/:taskId', claimsController.deleteTask);

// --- Claim payments ---
claimsRouter.get('/:id/payments', claimsController.getPayments);
claimsRouter.post('/:id/payments', authorize(['admin', 'manager']), claimsController.addPayment);
claimsRouter.put('/:id/payments/:paymentId', authorize(['admin', 'manager']), claimsController.updatePayment);
claimsRouter.delete('/:id/payments/:paymentId', authorize(['admin', 'manager']), claimsController.deletePayment);
claimsRouter.get('/:id/payments/summary', claimsController.getPaymentSummary);
claimsRouter.get('/:id/payments/by-type/:type', claimsController.getPaymentsByType);

// --- Claim custom identifiers ---
claimsRouter.get('/:id/identifiers', claimsController.getIdentifiers);
claimsRouter.post('/:id/identifiers', claimsController.addIdentifier);

// --- Acknowledgement ---
claimsRouter.get('/:id/acknowledgement', claimsController.getAcknowledgement);
claimsRouter.post('/:id/acknowledgement', claimsController.createAcknowledgement);

// --- Claim deadlines ---
claimsRouter.get('/:id/deadlines', claimsController.getDeadlines);
claimsRouter.post('/:id/deadlines', claimsController.addDeadline);
claimsRouter.put('/:id/deadlines/:did', claimsController.updateDeadline);
claimsRouter.delete('/:id/deadlines/:did', claimsController.deleteDeadline);

// --- File claim (submit to carrier) ---
claimsRouter.post('/:id/file', claimsController.fileClaim);

// --- Generate public acknowledgment link ---
claimsRouter.post('/:id/acknowledgment-link', claimsController.generateAcknowledgmentLink);

// --- Acknowledge carrier receipt of filed claim ---
claimsRouter.post('/:id/acknowledge', claimsController.acknowledgeClaimFiling);
