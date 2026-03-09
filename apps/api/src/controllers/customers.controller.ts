/**
 * Customers Controller - Request handling for customer management
 *
 * Location: apps/api/src/controllers/customers.controller.ts
 * Related: apps/api/src/services/customers.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { customersService } from '../services/customers.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const customersController = {
  list: asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    const effectiveCorporateId = tenant?.effectiveCorporateId ?? null;
    const isSuperAdmin = tenant?.isSuperAdmin ?? false;
    const result = await customersService.list(req.query, effectiveCorporateId, isSuperAdmin);

    if (req.query.includeStats === 'true' && Array.isArray(result.data) && result.data.length > 0) {
      const ids = result.data.map((c: any) => c.id);
      const statsMap = await customersService.getClaimStatsForCustomers(ids);
      const emptyStats = { totalClaims: 0, totalAmount: 0, openClaims: 0, avgResolutionDays: null };
      result.data = result.data.map((c: any) => ({
        ...c,
        claimStats: statsMap.get(c.id) || emptyStats,
      }));
    }

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
    const user = getUser(req);
    const note = await customersService.addNote(req.params.id as string, { ...req.body, createdBy: user.userId });
    res.status(201).json(note);
  }),

  getReports: asyncHandler(async (req, res) => {
    const reports = await customersService.getReports(req.params.id as string);
    res.json(reports);
  }),

  listProducts: asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    const result = await customersService.listAllProducts(tenant?.effectiveCorporateId ?? null, tenant?.isSuperAdmin ?? false);
    res.json(result);
  }),

  listContacts: asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    const result = await customersService.listAllContacts(tenant?.effectiveCorporateId ?? null, tenant?.isSuperAdmin ?? false);
    res.json(result);
  }),

  listLocations: asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    const result = await customersService.listAllAddresses(tenant?.effectiveCorporateId ?? null, tenant?.isSuperAdmin ?? false);
    res.json(result);
  }),

  createProduct: asyncHandler(async (req, res) => {
    const { customerId, ...data } = req.body;
    if (!customerId) { res.status(400).json({ error: 'customerId required' }); return; }
    const product = await customersService.addProduct(customerId, data);
    res.status(201).json(product);
  }),

  updateProduct: asyncHandler(async (req, res) => {
    const customerId = (req.body.customerId ?? req.query.customerId) as string;
    if (!customerId) { res.status(400).json({ error: 'customerId required' }); return; }
    const { customerId: _c, ...data } = req.body;
    const product = await customersService.updateProduct(customerId, req.params.id as string, data);
    res.json(product);
  }),

  deleteProduct: asyncHandler(async (req, res) => {
    const customerId = req.query.customerId as string;
    if (!customerId) { res.status(400).json({ error: 'customerId required' }); return; }
    await customersService.removeProduct(customerId, req.params.id as string);
    res.status(204).send();
  }),

  getCountries: asyncHandler(async (_req, res) => {
    const countries = await customersService.getCountries();
    res.json(countries);
  }),

  addressAutocomplete: asyncHandler(async (req, res) => {
    const suggestions = await customersService.addressAutocomplete(req.query.q as string);
    res.json(suggestions);
  }),

  massUpload: asyncHandler(async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    const uploadType = req.body?.type || 'customers';

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
        'company name': 'name', 'code': 'code', 'email': 'email', 'phone': 'phone',
        'address line 1': 'addressLine1', 'address line 2': 'addressLine2',
        'city': 'city', 'state': 'state', 'zip code': 'zipCode', 'country': 'country',
        'industry': 'industry', 'is corporate': 'isCorporate',
        'customer name': 'customerName', 'first name': 'firstName', 'last name': 'lastName',
        'title': 'title', 'department': 'department', 'is primary': 'isPrimary',
        'location name': 'locationName', 'is default': 'isDefault',
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

    const result = await customersService.massUpload(rows, uploadType);
    res.json(result);
  }),
};
