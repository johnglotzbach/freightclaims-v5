/**
 * Claims Controller - Request handling for claim endpoints
 *
 * Thin layer that extracts request data, calls ClaimsService for business logic,
 * and returns formatted JSON responses. All error handling is delegated to the
 * global error handler middleware via asyncHandler.
 *
 * Location: apps/api/src/controllers/claims.controller.ts
 * Related: apps/api/src/services/claims.service.ts
 *          apps/api/src/routes/claims.routes.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { claimsService } from '../services/claims.service';
import type { JwtPayload } from '../middleware/auth.middleware';
import type { TenantContext } from '../middleware/tenant.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

function getTenant(req: Request): TenantContext {
  return req.tenant || { corporateId: null, isSuperAdmin: false, effectiveCorporateId: null };
}

export const claimsController = {
  /**
   * GET /api/v1/claims
   * List claims with pagination, filtering, and sorting
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const tenant = getTenant(req);
    const result = await claimsService.list(req.query, user, tenant);
    res.json(result);
  }),

  /**
   * GET /api/v1/claims/:id
   * Get a single claim by ID with all related data
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const claim = await claimsService.getById(req.params.id as string, user);
    res.json(claim);
  }),

  /**
   * POST /api/v1/claims
   * Create a new freight claim
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const claim = await claimsService.create(req.body, user);
    res.status(201).json(claim);
  }),

  /**
   * PUT /api/v1/claims/:id
   * Update an existing claim
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const claim = await claimsService.update(req.params.id as string, req.body, user);
    res.json(claim);
  }),

  /**
   * DELETE /api/v1/claims/:id
   * Soft-delete a claim (admin/manager only)
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.delete(req.params.id as string, user);
    res.status(204).send();
  }),

  /** PUT /api/v1/claims/:id/status - Update claim status */
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const claim = await claimsService.updateStatus(req.params.id as string, req.body.status, user);
    res.json(claim);
  }),

  // --- Parties ---
  getParties: asyncHandler(async (req: Request, res: Response) => {
    const parties = await claimsService.getParties(req.params.id as string);
    res.json(parties);
  }),

  addParty: asyncHandler(async (req: Request, res: Response) => {
    const party = await claimsService.addParty(req.params.id as string, req.body);
    res.status(201).json(party);
  }),

  updateParty: asyncHandler(async (req: Request, res: Response) => {
    const party = await claimsService.updateParty(req.params.id as string, req.params.partyId as string, req.body);
    res.json(party);
  }),

  removeParty: asyncHandler(async (req: Request, res: Response) => {
    await claimsService.removeParty(req.params.id as string, req.params.partyId as string);
    res.status(204).send();
  }),

  // --- Products ---
  getProducts: asyncHandler(async (req: Request, res: Response) => {
    const products = await claimsService.getProducts(req.params.id as string);
    res.json(products);
  }),

  addProduct: asyncHandler(async (req: Request, res: Response) => {
    const product = await claimsService.addProduct(req.params.id as string, req.body);
    res.status(201).json(product);
  }),

  updateProduct: asyncHandler(async (req: Request, res: Response) => {
    const product = await claimsService.updateProduct(req.params.id as string, req.params.productId as string, req.body);
    res.json(product);
  }),

  removeProduct: asyncHandler(async (req: Request, res: Response) => {
    await claimsService.removeProduct(req.params.id as string, req.params.productId as string);
    res.status(204).send();
  }),

  // --- Comments ---
  getComments: asyncHandler(async (req: Request, res: Response) => {
    const comments = await claimsService.getComments(req.params.id as string);
    res.json(comments);
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const comment = await claimsService.addComment(req.params.id as string, req.body, user);
    res.status(201).json(comment);
  }),

  // --- Tasks ---
  getTasks: asyncHandler(async (req: Request, res: Response) => {
    const tasks = await claimsService.getTasks(req.params.id as string);
    res.json(tasks);
  }),

  addTask: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const task = await claimsService.addTask(req.params.id as string, req.body, user);
    res.status(201).json(task);
  }),

  updateTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await claimsService.updateTask(req.params.id as string, req.params.taskId as string, req.body);
    res.json(task);
  }),

  deleteTask: asyncHandler(async (req: Request, res: Response) => {
    await claimsService.deleteTask(req.params.id as string, req.params.taskId as string);
    res.status(204).send();
  }),

  // --- Payments ---
  getPayments: asyncHandler(async (req: Request, res: Response) => {
    const payments = await claimsService.getPayments(req.params.id as string);
    res.json(payments);
  }),

  addPayment: asyncHandler(async (req: Request, res: Response) => {
    const payment = await claimsService.addPayment(req.params.id as string, req.body);
    res.status(201).json(payment);
  }),

  updatePayment: asyncHandler(async (req: Request, res: Response) => {
    const payment = await claimsService.updatePayment(req.params.id as string, req.params.paymentId as string, req.body);
    res.json(payment);
  }),

  // --- Identifiers ---
  getIdentifiers: asyncHandler(async (req: Request, res: Response) => {
    const identifiers = await claimsService.getIdentifiers(req.params.id as string);
    res.json(identifiers);
  }),

  addIdentifier: asyncHandler(async (req: Request, res: Response) => {
    const identifier = await claimsService.addIdentifier(req.params.id as string, req.body);
    res.status(201).json(identifier);
  }),

  // --- Dashboard ---
  getDashboardStats: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const tenant = getTenant(req);
    const stats = await claimsService.getDashboardStats(user, tenant);
    res.json(stats);
  }),

  // --- Mass Upload ---
  massUpload: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const result = await claimsService.massUpload(req.body, user);
    res.json(result);
  }),

  getMassUploadHistory: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const history = await claimsService.getMassUploadHistory(user);
    res.json(history);
  }),

  // --- Settings ---
  getSettings: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await claimsService.getSettings();
    res.json(settings);
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const settings = await claimsService.updateSettings(req.body);
    res.json(settings);
  }),

  // --- Acknowledgement ---
  getAcknowledgement: asyncHandler(async (req: Request, res: Response) => {
    const ack = await claimsService.getAcknowledgement(req.params.id as string);
    res.json(ack);
  }),

  createAcknowledgement: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const ack = await claimsService.createAcknowledgement(req.params.id as string, req.body, user);
    res.status(201).json(ack);
  }),
};
