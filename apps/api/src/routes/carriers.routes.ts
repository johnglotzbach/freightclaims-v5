import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

export const carriersRouter: Router = Router();

carriersRouter.use(authenticate);

carriersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string | undefined)?.trim();
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { scacCode: { contains: search, mode: 'insensitive' } },
        { dotNumber: { contains: search, mode: 'insensitive' } },
        { mcNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [carriers, total] = await Promise.all([
      prisma.carrier.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { contacts: true } } },
      }),
      prisma.carrier.count({ where }),
    ]);

    res.json({ success: true, data: carriers, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

carriersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const carrier = await prisma.carrier.findUnique({
      where: { id },
      include: { contacts: true, integrations: true },
    });
    if (!carrier) return res.status(404).json({ success: false, error: 'Carrier not found' });
    res.json({ success: true, data: carrier });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

carriersRouter.post('/', authorize(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const carrier = await prisma.carrier.create({ data: req.body });
    res.status(201).json({ success: true, data: carrier });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

carriersRouter.put('/:id', authorize(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const carrier = await prisma.carrier.update({ where: { id }, data: req.body });
    res.json({ success: true, data: carrier });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Carrier not found' });
    res.status(500).json({ success: false, error: err.message });
  }
});

carriersRouter.delete('/:id', authorize(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.carrierContact.deleteMany({ where: { carrierId: id } });
    await prisma.carrier.delete({ where: { id } });
    res.json({ success: true, message: 'Carrier deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Carrier not found' });
    if (err.code === 'P2003') return res.status(409).json({ success: false, error: 'Cannot delete carrier — it is referenced by existing claims or shipments. Remove those associations first.' });
    res.status(500).json({ success: false, error: err.message });
  }
});

carriersRouter.post('/:id/contacts', async (req: Request, res: Response) => {
  try {
    const carrierId = req.params.id as string;
    const carrier = await prisma.carrier.findUnique({ where: { id: carrierId } });
    if (!carrier) return res.status(404).json({ success: false, error: 'Carrier not found' });
    const contact = await prisma.carrierContact.create({ data: { ...req.body, carrierId } });
    res.status(201).json({ success: true, data: contact });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

carriersRouter.put('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const carrierId = req.params.id as string;
    const contactId = req.params.contactId as string;
    const contact = await prisma.carrierContact.findFirst({ where: { id: contactId, carrierId } });
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    const updated = await prisma.carrierContact.update({ where: { id: contactId }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

carriersRouter.delete('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const carrierId = req.params.id as string;
    const contactId = req.params.contactId as string;
    const contact = await prisma.carrierContact.findFirst({ where: { id: contactId, carrierId } });
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    await prisma.carrierContact.delete({ where: { id: contactId } });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
