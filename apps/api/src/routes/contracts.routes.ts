/**
 * Contracts & Insurance Routes - Manage contracts, insurance certs, tariffs
 */
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const contractsRouter: Router = Router();
contractsRouter.use(authenticate);

function getTenantId(req: any): string | undefined {
  return req.user?.corporateId ?? req.tenant?.effectiveCorporateId;
}

// --- Insurance Certificates (static paths BEFORE /:id) ---
contractsRouter.get('/insurance', async (req, res, next) => {
  try {
    const { customerId, carrierId, page = '1', limit = '25' } = req.query;
    const corporateId = getTenantId(req);
    const where: Record<string, unknown> = {};
    if (corporateId) where.corporateId = corporateId;
    if (customerId) where.customerId = customerId as string;
    if (carrierId) where.carrierId = carrierId as string;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.insuranceCertificate.findMany({ where: where as any, skip, take: Number(limit), orderBy: { expirationDate: 'desc' } }),
      prisma.insuranceCertificate.count({ where: where as any }),
    ]);
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
});

contractsRouter.post('/insurance', async (req, res, next) => {
  try {
    const { customerId, carrierId, certificateNumber, provider, policyType, coverageAmount, effectiveDate, expirationDate, deductible } = req.body;
    if (!certificateNumber || !provider || !coverageAmount || !effectiveDate || !expirationDate) {
      return res.status(400).json({ success: false, error: 'certificateNumber, provider, coverageAmount, effectiveDate, and expirationDate are required' });
    }
    const corporateId = getTenantId(req);
    const cert = await prisma.insuranceCertificate.create({
      data: {
        customerId, carrierId, corporateId, certificateNumber, provider,
        policyType: policyType || 'cargo', coverageAmount,
        effectiveDate: new Date(effectiveDate),
        expirationDate: new Date(expirationDate),
        deductible,
      },
    });
    res.status(201).json({ success: true, data: cert });
  } catch (err) { next(err); }
});

contractsRouter.get('/insurance/:id', async (req, res, next) => {
  try {
    const cert = await prisma.insuranceCertificate.findUnique({ where: { id: req.params.id } });
    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });
    res.json({ success: true, data: cert });
  } catch (err) { next(err); }
});

contractsRouter.put('/insurance/:id', async (req, res, next) => {
  try {
    const { certificateNumber, provider, policyType, coverageAmount, effectiveDate, expirationDate, deductible, customerId, carrierId } = req.body;
    const data: Record<string, unknown> = {};
    if (certificateNumber !== undefined) data.certificateNumber = certificateNumber;
    if (provider !== undefined) data.provider = provider;
    if (policyType !== undefined) data.policyType = policyType;
    if (coverageAmount !== undefined) data.coverageAmount = coverageAmount;
    if (effectiveDate !== undefined) data.effectiveDate = new Date(effectiveDate);
    if (expirationDate !== undefined) data.expirationDate = new Date(expirationDate);
    if (deductible !== undefined) data.deductible = deductible;
    if (customerId !== undefined) data.customerId = customerId;
    if (carrierId !== undefined) data.carrierId = carrierId;
    const cert = await prisma.insuranceCertificate.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: cert });
  } catch (err) { next(err); }
});

// --- Carrier Tariffs (static paths BEFORE /:id) ---
contractsRouter.get('/tariffs', async (req, res, next) => {
  try {
    const { carrierId } = req.query;
    const where = carrierId ? { carrierId: carrierId as string } : {};
    const data = await prisma.carrierTariff.findMany({ where, orderBy: { effectiveDate: 'desc' } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

contractsRouter.post('/tariffs', async (req, res, next) => {
  try {
    const { carrierId, name, effectiveDate } = req.body;
    if (!carrierId || !name) {
      return res.status(400).json({ success: false, error: 'carrierId and name are required' });
    }
    const { maxLiability, filingDeadlineDays, rules: bodyRules } = req.body;
    const tariff = await prisma.carrierTariff.create({
      data: {
        carrierId, name,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        rules: bodyRules || {},
        maxLiability: maxLiability || undefined,
        filingDeadlineDays: filingDeadlineDays || undefined,
      },
    });
    res.status(201).json({ success: true, data: tariff });
  } catch (err) { next(err); }
});

// --- Release Value Tables (static paths BEFORE /:id) ---
contractsRouter.get('/release-values', async (req, res, next) => {
  try {
    const { carrierId } = req.query;
    const where = carrierId ? { carrierId: carrierId as string } : {};
    const data = await prisma.releaseValueTable.findMany({ where });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

contractsRouter.post('/release-values', async (req, res, next) => {
  try {
    const { carrierId } = req.body;
    if (!carrierId) {
      return res.status(400).json({ success: false, error: 'carrierId is required' });
    }
    const { carrierId: rvCarrierId, commodityType, releaseValue: rvVal, unit, notes } = req.body;
    const rv = await prisma.releaseValueTable.create({ data: { carrierId: rvCarrierId, commodityType, releaseValue: rvVal, unit, notes } as any });
    res.status(201).json({ success: true, data: rv });
  } catch (err) { next(err); }
});

// --- Contracts (parameterized /:id routes LAST) ---
contractsRouter.get('/', async (req, res, next) => {
  try {
    const { customerId, carrierId, type, page = '1', limit = '25' } = req.query;
    const corporateId = getTenantId(req);
    const where: Record<string, unknown> = {};
    if (corporateId) where.corporateId = corporateId;
    if (customerId) where.customerId = customerId as string;
    if (carrierId) where.carrierId = carrierId as string;
    if (type) where.type = type as string;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.contract.findMany({ where: where as any, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.contract.count({ where: where as any }),
    ]);
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
});

contractsRouter.post('/', async (req, res, next) => {
  try {
    const { name, customerId, carrierId, type, startDate, endDate, contractNumber, terms, maxLiability, releaseValue } = req.body;
    if (!name || !customerId || !startDate) {
      return res.status(400).json({ success: false, error: 'name, customerId, and startDate are required' });
    }
    const corporateId = getTenantId(req);
    const contract = await prisma.contract.create({
      data: { name, customerId, carrierId, corporateId, type, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, contractNumber, terms, maxLiability, releaseValue },
    });
    res.status(201).json({ success: true, data: contract });
  } catch (err) { next(err); }
});

contractsRouter.get('/:id', async (req, res, next) => {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
});

contractsRouter.put('/:id', authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { name, customerId, carrierId, type, startDate, endDate, contractNumber, terms, maxLiability, releaseValue, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (customerId !== undefined) data.customerId = customerId;
    if (carrierId !== undefined) data.carrierId = carrierId;
    if (type !== undefined) data.type = type;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (contractNumber !== undefined) data.contractNumber = contractNumber;
    if (terms !== undefined) data.terms = terms;
    if (maxLiability !== undefined) data.maxLiability = maxLiability;
    if (releaseValue !== undefined) data.releaseValue = releaseValue;
    if (isActive !== undefined) data.isActive = isActive;

    const contract = await prisma.contract.update({ where: { id: String(req.params.id) }, data });
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
});

contractsRouter.delete('/:id', authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    await prisma.contract.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});
