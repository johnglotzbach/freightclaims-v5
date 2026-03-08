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

  // --- Parties (verify claim ownership first) ---
  getParties: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const parties = await claimsService.getParties(req.params.id as string);
    res.json(parties);
  }),

  addParty: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const party = await claimsService.addParty(req.params.id as string, req.body);
    res.status(201).json(party);
  }),

  updateParty: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const party = await claimsService.updateParty(req.params.id as string, req.params.partyId as string, req.body);
    res.json(party);
  }),

  removeParty: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    await claimsService.removeParty(req.params.id as string, req.params.partyId as string);
    res.status(204).send();
  }),

  // --- Products (verify claim ownership first) ---
  getProducts: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const products = await claimsService.getProducts(req.params.id as string);
    res.json(products);
  }),

  addProduct: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const product = await claimsService.addProduct(req.params.id as string, req.body);
    res.status(201).json(product);
  }),

  updateProduct: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const product = await claimsService.updateProduct(req.params.id as string, req.params.productId as string, req.body);
    res.json(product);
  }),

  removeProduct: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    await claimsService.removeProduct(req.params.id as string, req.params.productId as string);
    res.status(204).send();
  }),

  // --- Comments (verify claim ownership first) ---
  getComments: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const comments = await claimsService.getComments(req.params.id as string);
    res.json(comments);
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const comment = await claimsService.addComment(req.params.id as string, req.body, user);
    res.status(201).json(comment);
  }),

  // --- Global tasks (all tasks across claims) ---
  getAllTasks: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const tasks = await claimsService.getAllTasks(user);
    res.json(tasks);
  }),

  createGlobalTask: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const task = await claimsService.createGlobalTask(req.body, user);
    res.status(201).json(task);
  }),

  // --- Tasks (verify claim ownership first) ---
  getTasks: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const tasks = await claimsService.getTasks(req.params.id as string);
    res.json(tasks);
  }),

  addTask: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const task = await claimsService.addTask(req.params.id as string, req.body, user);
    res.status(201).json(task);
  }),

  updateTask: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const task = await claimsService.updateTask(req.params.id as string, req.params.taskId as string, req.body);
    res.json(task);
  }),

  deleteTask: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    await claimsService.deleteTask(req.params.id as string, req.params.taskId as string);
    res.status(204).send();
  }),

  // --- Payments (verify claim ownership first) ---
  getPayments: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const payments = await claimsService.getPayments(req.params.id as string);
    res.json(payments);
  }),

  addPayment: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const payment = await claimsService.addPayment(req.params.id as string, req.body);
    res.status(201).json(payment);
  }),

  updatePayment: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const payment = await claimsService.updatePayment(req.params.id as string, req.params.paymentId as string, req.body);
    res.json(payment);
  }),

  // --- Identifiers (verify claim ownership first) ---
  getIdentifiers: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const identifiers = await claimsService.getIdentifiers(req.params.id as string);
    res.json(identifiers);
  }),

  addIdentifier: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
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
    const file = (req as any).file as Express.Multer.File | undefined;

    let rows: Record<string, unknown>[] = [];

    if (file) {
      const csvText = file.buffer.toString('utf-8');
      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        res.status(400).json({ error: 'CSV file must have a header row and at least one data row' });
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const headerMap: Record<string, string> = {
        'claim number': 'claimNumber', 'pro number': 'proNumber', 'bol number': 'bolNumber',
        'claim type': 'claimType', 'claim amount': 'claimAmount', 'ship date': 'shipDate',
        'delivery date': 'deliveryDate', 'customer name': 'customerName', 'carrier name': 'carrierName',
        'origin city': 'originCity', 'origin state': 'originState', 'destination city': 'destinationCity',
        'destination state': 'destinationState', 'description': 'description',
        'company name': 'name', 'code': 'code', 'email': 'email', 'phone': 'phone',
        'first name': 'firstName', 'last name': 'lastName', 'title': 'title',
        'scac code': 'scacCode', 'dot number': 'dotNumber', 'mc number': 'mcNumber',
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

    const uploadType = req.body?.type || (file ? 'claims' : 'claims');
    const result = await claimsService.massUpload({ rows, type: uploadType }, user);
    res.json(result);
  }),

  getMassUploadHistory: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const history = await claimsService.getMassUploadHistory(user);
    res.json(history);
  }),

  // --- Settings ---
  getSettings: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const settings = await claimsService.getSettings(user);
    res.json(settings);
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const settings = await claimsService.updateSettings(req.body, user);
    res.json(settings);
  }),

  // --- Acknowledgement (verify claim ownership first) ---
  getAcknowledgement: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const ack = await claimsService.getAcknowledgement(req.params.id as string);
    res.json(ack);
  }),

  createAcknowledgement: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    await claimsService.getById(req.params.id as string, user);
    const ack = await claimsService.createAcknowledgement(req.params.id as string, req.body, user);
    res.status(201).json(ack);
  }),

  fileClaim: asyncHandler(async (req: Request, res: Response) => {
    const user = getUser(req);
    const claimId = req.params.id as string;
    const { sendEmail, partyIds, notes } = req.body;
    const result = await claimsService.fileClaim(claimId, { sendEmail, partyIds, notes }, user);
    res.json(result);
  }),
};
