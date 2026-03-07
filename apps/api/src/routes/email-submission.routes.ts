import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

export const emailSubmissionRouter = Router();

emailSubmissionRouter.use(authenticate);

function getCorporateId(req: any): string {
  return req.user?.corporateId ?? req.tenant?.effectiveCorporateId ?? '';
}

emailSubmissionRouter.get('/config', async (req, res, next) => {
  try {
    const corporateId = getCorporateId(req);
    const config = await prisma.emailSubmissionConfig.findUnique({
      where: { corporateId },
      include: { approvedDomains: true, approvedSenders: true },
    });
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

emailSubmissionRouter.put('/config', authorize(['admin']), async (req, res, next) => {
  try {
    const corporateId = getCorporateId(req);
    const { submissionPrefix, companyDomain, isActive } = req.body;
    const config = await prisma.emailSubmissionConfig.upsert({
      where: { corporateId },
      create: { corporateId, submissionPrefix, companyDomain, isActive },
      update: { submissionPrefix, companyDomain, isActive },
      include: { approvedDomains: true, approvedSenders: true },
    });
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

emailSubmissionRouter.post('/domains', authorize(['admin']), async (req, res, next) => {
  try {
    const corporateId = getCorporateId(req);
    const { domain } = req.body;
    let config = await prisma.emailSubmissionConfig.findUnique({ where: { corporateId } });
    if (!config) {
      config = await prisma.emailSubmissionConfig.create({
        data: { corporateId, companyDomain: `${corporateId}.freightclaims.com` },
      });
    }
    const result = await prisma.approvedEmailDomain.create({
      data: { configId: config.id, domain, isActive: true },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

emailSubmissionRouter.put('/domains/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { isActive, domain } = req.body;
    const result = await prisma.approvedEmailDomain.update({
      where: { id: req.params.id },
      data: { ...(isActive !== undefined && { isActive }), ...(domain && { domain }) },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

emailSubmissionRouter.delete('/domains/:id', authorize(['admin']), async (req, res, next) => {
  try {
    await prisma.approvedEmailDomain.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

emailSubmissionRouter.post('/senders', authorize(['admin']), async (req, res, next) => {
  try {
    const corporateId = getCorporateId(req);
    const { email } = req.body;
    let config = await prisma.emailSubmissionConfig.findUnique({ where: { corporateId } });
    if (!config) {
      config = await prisma.emailSubmissionConfig.create({
        data: { corporateId, companyDomain: `${corporateId}.freightclaims.com` },
      });
    }
    const result = await prisma.approvedEmailSender.create({
      data: { configId: config.id, email, isActive: true },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

emailSubmissionRouter.put('/senders/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { isActive, email } = req.body;
    const result = await prisma.approvedEmailSender.update({
      where: { id: req.params.id },
      data: { ...(isActive !== undefined && { isActive }), ...(email && { email }) },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

emailSubmissionRouter.delete('/senders/:id', authorize(['admin']), async (req, res, next) => {
  try {
    await prisma.approvedEmailSender.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

emailSubmissionRouter.post('/validate-sender', async (req, res, next) => {
  try {
    const corporateId = getCorporateId(req);
    const { senderEmail } = req.body;
    if (!senderEmail || !senderEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid senderEmail is required' });
    }

    const config = await prisma.emailSubmissionConfig.findUnique({
      where: { corporateId },
      include: { approvedDomains: { where: { isActive: true } }, approvedSenders: { where: { isActive: true } } },
    });

    if (!config) {
      return res.json({ success: true, data: { allowed: false, reason: 'No submission config found' } });
    }

    const senderDomain = `@${senderEmail.split('@')[1]}`;
    const isDomainApproved = config.approvedDomains.some((d: any) => d.domain === senderDomain);
    const isSenderApproved = config.approvedSenders.some((s: any) => s.email === senderEmail);

    res.json({
      success: true,
      data: {
        allowed: isDomainApproved || isSenderApproved,
        reason: isDomainApproved ? 'domain_approved' : isSenderApproved ? 'sender_approved' : 'not_approved',
      },
    });
  } catch (err) { next(err); }
});
