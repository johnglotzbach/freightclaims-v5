/**
 * AI Routes - AI agent endpoints and conversation management
 *
 * Exposes the AI agent system through REST endpoints. Each specialized agent
 * (intake, compliance, negotiation, etc.) gets its own endpoint. The copilot
 * endpoint provides a conversational interface for end users.
 *
 * Location: apps/api/src/routes/ai.routes.ts
 * Related: apps/ai-agent/src/ (AI agent implementations)
 *          apps/api/src/controllers/ai.controller.ts
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { aiController } from '../controllers/ai.controller';
import { env } from '../config/env';
import { generateContent } from '../services/agents/gemini-client';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export const aiRouter: Router = Router();

// Diagnostic endpoint — test Gemini connectivity without auth
aiRouter.get('/health', async (_req, res) => {
  const keyPresent = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  const keyPrefix = keyPresent ? env.GEMINI_API_KEY.slice(0, 8) + '...' : '(empty)';

  if (!keyPresent) {
    return res.json({
      status: 'misconfigured',
      geminiKey: keyPrefix,
      model: env.AI_MODEL,
      error: 'GEMINI_API_KEY is empty or not set',
    });
  }

  try {
    const result = await generateContent('What is a freight claim? Answer in one sentence.', {
      config: { maxOutputTokens: 100, temperature: 0.3 },
    });
    res.json({
      status: 'ok',
      geminiKey: keyPrefix,
      model: env.AI_MODEL,
      testResponse: result.text.trim(),
      tokenUsage: result.tokenUsage,
    });
  } catch (err: any) {
    logger.error({ err }, 'AI health check failed');
    res.json({
      status: 'error',
      geminiKey: keyPrefix,
      model: env.AI_MODEL,
      error: err.message || String(err),
    });
  }
});

aiRouter.use(authenticate);

// --- AI agent endpoints ---
aiRouter.post('/agents/intake', aiController.runIntakeAgent);
aiRouter.post('/agents/compliance', aiController.runComplianceAgent);
aiRouter.post('/agents/negotiation', aiController.runNegotiationAgent);
aiRouter.post('/agents/valuation', aiController.runValuationAgent);
aiRouter.post('/agents/documents', aiController.runDocumentsAgent);
aiRouter.post('/agents/followup', aiController.runFollowUpAgent);
aiRouter.post('/agents/predictor', aiController.runPredictorAgent);
aiRouter.post('/agents/risk', aiController.runRiskAgent);
aiRouter.post('/agents/fraud', aiController.runFraudAgent);
aiRouter.post('/agents/denial', aiController.runDenialAgent);
aiRouter.post('/agents/communication', aiController.runCommunicationAgent);
aiRouter.post('/agents/rootcause', aiController.runRootCauseAgent);

// --- AI copilot (conversational interface) ---
aiRouter.post('/copilot/chat', aiController.chat);
aiRouter.get('/copilot/conversations', aiController.getConversations);
aiRouter.get('/copilot/conversations/:id', aiController.getConversation);
aiRouter.delete('/copilot/conversations/:id', aiController.deleteConversation);

// --- AI-processed documents ---
aiRouter.get('/documents', aiController.getAIDocuments);
aiRouter.delete('/documents/:id', aiController.deleteAIDocument);
aiRouter.post('/documents/match-claim', aiController.matchDocumentToClaim);

// --- Agent status and monitoring ---
aiRouter.get('/status', aiController.getAgentStatus);
aiRouter.get('/history', aiController.getAgentHistory);

// --- AI integration endpoints ---
async function ensureClaimAccess(claimId: string, user: { corporateId?: string | null; isSuperAdmin?: boolean }) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId, deletedAt: null },
    include: {
      parties: true,
      products: true,
      comments: true,
      documents: true,
      tasks: true,
      identifiers: true,
      emailLogs: true,
      deadlines: true,
      customer: { select: { name: true, code: true } },
    },
  });
  if (!claim) return null;
  if (!user.isSuperAdmin && user.corporateId && claim.corporateId !== user.corporateId) return null;
  return claim;
}

aiRouter.post('/compose-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { claimId, context, replyTo } = req.body || {};
    if (!claimId) {
      res.status(400).json({ error: 'claimId is required' });
      return;
    }
    const claim = await ensureClaimAccess(claimId, user);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }
    const { generateJSON } = await import('../services/agents/gemini-client');
    const claimSummary = JSON.stringify({
      claimNumber: claim.claimNumber,
      proNumber: claim.proNumber,
      status: claim.status,
      claimType: claim.claimType,
      claimAmount: Number(claim.claimAmount),
      description: claim.description,
      parties: claim.parties.map((p: any) => ({ type: p.type, name: p.name, email: p.email })),
      products: claim.products.map((p: any) => ({ description: p.description, quantity: p.quantity, value: p.value })),
      recentComments: claim.comments.slice(-5).map((c: any) => c.content),
      recentEmails: claim.emailLogs.slice(-3).map((e: any) => ({ subject: e.subject, direction: e.direction })),
    }, null, 2);
    const prompt = `Compose a professional freight claim email based on this claim data. ${context ? `Additional context: ${context}` : ''} ${replyTo ? `This is a reply to: ${replyTo}` : ''}

Claim data:
${claimSummary}

Return a JSON object with exactly: { "subject": "string", "body": "string" }
The body should be plain text, professional, and include key claim details (PRO, amount, description).`;
    const result = await generateJSON<{ subject: string; body: string }>(prompt);
    res.json({ subject: result.subject || '', body: result.body || '' });
  } catch (err) {
    next(err);
  }
});

aiRouter.post('/recommend-tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { claimId } = req.body || {};
    if (!claimId) {
      res.status(400).json({ error: 'claimId is required' });
      return;
    }
    const claim = await ensureClaimAccess(claimId, user);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }
    const { generateJSON } = await import('../services/agents/gemini-client');
    const claimSummary = JSON.stringify({
      claimNumber: claim.claimNumber,
      status: claim.status,
      claimType: claim.claimType,
      claimAmount: Number(claim.claimAmount),
      createdAt: claim.createdAt,
      tasks: claim.tasks.map((t: any) => ({ title: t.title, status: t.status, dueDate: t.dueDate })),
      documents: claim.documents.map((d: any) => d.documentName),
      deadlines: claim.deadlines.map((d: any) => ({ type: d.type, dueDate: d.dueDate, status: d.status })),
    }, null, 2);
    const prompt = `Based on this freight claim data, suggest 3-5 next tasks. Consider: claim status, age, missing documents, overdue deadlines.

Claim data:
${claimSummary}

Return JSON: { "recommendations": [{ "title": "string", "description": "string", "priority": "high|medium|low", "dueDays": number }] }`;
    const result = await generateJSON<{ recommendations: Array<{ title: string; description: string; priority: string; dueDays: number }> }>(prompt);
    res.json({ recommendations: result.recommendations || [] });
  } catch (err) {
    next(err);
  }
});

aiRouter.post('/smart-route', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { claimId } = req.body || {};
    if (!claimId) {
      res.status(400).json({ error: 'claimId is required' });
      return;
    }
    const claim = await ensureClaimAccess(claimId, user);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }
    const corporateId = claim.corporateId || user.corporateId;
    if (!corporateId) {
      res.status(400).json({ error: 'No corporate context for routing' });
      return;
    }
    const analysts = await prisma.user.findMany({
      where: { corporateId, isActive: true, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const countMap: Record<string, number> = {};
    for (const a of analysts) {
      const count = await prisma.claim.count({
        where: { assignedToId: a.id, status: { notIn: ['closed', 'denied', 'settled'] }, deletedAt: null } as any,
      });
      countMap[a.id] = count;
    }
    const { generateJSON } = await import('../services/agents/gemini-client');
    const claimSummary = JSON.stringify({
      claimNumber: claim.claimNumber,
      claimType: claim.claimType,
      claimAmount: Number(claim.claimAmount),
      status: claim.status,
    }, null, 2);
    const analystsSummary = JSON.stringify(analysts.map((a: any) => ({
      userId: a.id,
      name: `${a.firstName} ${a.lastName}`,
      currentOpenClaims: countMap[a.id] ?? 0,
    })), null, 2);
    const prompt = `Suggest the best analyst to assign this claim based on claim type, value, and workload.

Claim:
${claimSummary}

Available analysts (with open claim count):
${analystsSummary}

Return JSON: { "suggestedAssignee": { "userId": "string", "name": "string", "reason": "string" } }`;
    const result = await generateJSON<{ suggestedAssignee: { userId: string; name: string; reason: string } }>(prompt);
    const suggested = result.suggestedAssignee;
    if (suggested && analysts.some((a: any) => a.id === suggested.userId)) {
      res.json({ suggestedAssignee: suggested });
    } else {
      const fallback = analysts[0];
      res.json({
        suggestedAssignee: fallback
          ? { userId: fallback.id, name: `${fallback.firstName} ${fallback.lastName}`, reason: 'Default assignment (no AI match)' }
          : null,
      });
    }
  } catch (err) {
    next(err);
  }
});

aiRouter.post('/estimate-liability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { claimId } = req.body || {};
    if (!claimId) {
      res.status(400).json({ error: 'claimId is required' });
      return;
    }
    const claim = await ensureClaimAccess(claimId, user);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }
    const carrierParty = claim.parties.find((p: any) => p.type === 'carrier');
    const scacCode = carrierParty?.scacCode;
    let contractData: any = null;
    let tariffData: any = null;
    let releaseValueData: any = null;
    if (scacCode) {
      const carrier = await prisma.carrier.findUnique({ where: { scacCode } });
      if (carrier) {
        const [contract, tariff, rv] = await Promise.all([
          prisma.contract.findFirst({ where: { carrierId: carrier.id, customerId: claim.customerId, isActive: true } }),
          prisma.carrierTariff.findFirst({ where: { carrierId: carrier.id }, orderBy: { effectiveDate: 'desc' } }),
          prisma.releaseValueTable.findFirst({ where: { carrierId: carrier.id } }),
        ]);
        contractData = contract ? { maxLiability: contract.maxLiability, releaseValue: contract.releaseValue, terms: contract.terms } : null;
        tariffData = tariff ? { maxLiability: tariff.maxLiability, rules: tariff.rules } : null;
        releaseValueData = rv ? { minValue: rv.minValue, maxValue: rv.maxValue, unit: rv.unit } : null;
      }
    }
    const { generateJSON } = await import('../services/agents/gemini-client');
    const claimSummary = JSON.stringify({
      claimNumber: claim.claimNumber,
      claimAmount: Number(claim.claimAmount),
      claimType: claim.claimType,
      proNumber: claim.proNumber,
      products: claim.products.map((p: any) => ({ description: p.description, value: p.value, weight: p.weight, nmfcCode: p.nmfcCode })),
      carrier: carrierParty ? { name: carrierParty.name, scacCode } : null,
      identifiers: claim.identifiers,
      contract: contractData,
      tariff: tariffData,
      releaseValueTable: releaseValueData,
    }, null, 2);
    const prompt = `Estimate carrier liability for this freight claim using Carmack Amendment rules, released value, and contract terms.

Claim and carrier/contract data:
${claimSummary}

Return JSON: { "estimatedLiability": number, "confidence": number (0-1), "factors": [{ "name": "string", "impact": "string", "description": "string" }], "recommendation": "string" }`;
    const result = await generateJSON<{
      estimatedLiability: number;
      confidence: number;
      factors: Array<{ name: string; impact: string; description: string }>;
      recommendation: string;
    }>(prompt);
    res.json({
      estimatedLiability: result.estimatedLiability ?? 0,
      confidence: result.confidence ?? 0,
      factors: result.factors || [],
      recommendation: result.recommendation || '',
    });
  } catch (err) {
    next(err);
  }
});

aiRouter.post('/detect-duplicates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { claimId } = req.body || {};
    if (!claimId) {
      res.status(400).json({ error: 'claimId is required' });
      return;
    }
    const claim = await ensureClaimAccess(claimId, user);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }
    const proNumber = claim.proNumber;
    const identifiers = claim.identifiers || [];
    const bolValues = identifiers.filter((i: any) => i.type === 'bol').map((i: any) => i.value);
    const poValues = identifiers.filter((i: any) => i.type === 'po').map((i: any) => i.value);
    const corporateFilter = user.isSuperAdmin ? {} : { corporateId: user.corporateId || '__none__' };
    const orConditions: any[] = [{ proNumber: { equals: proNumber, mode: 'insensitive' } }];
    if (bolValues.length) orConditions.push({ identifiers: { some: { type: 'bol', value: { in: bolValues } } } });
    if (poValues.length) orConditions.push({ identifiers: { some: { type: 'po', value: { in: poValues } } } });
    const candidates = await prisma.claim.findMany({
      where: { ...corporateFilter, id: { not: claimId }, deletedAt: null, OR: orConditions },
      take: 20,
      include: { identifiers: true },
    });
    if (candidates.length === 0) {
      res.json({ duplicates: [] });
      return;
    }
    const { generateJSON } = await import('../services/agents/gemini-client');
    const sourceSummary = JSON.stringify({ id: claim.id, claimNumber: claim.claimNumber, proNumber, identifiers }, null, 2);
    const candidatesSummary = JSON.stringify(candidates.map((c: any) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      proNumber: c.proNumber,
      identifiers: c.identifiers,
      status: c.status,
    })), null, 2);
    const prompt = `Assess which of these claims are likely duplicates of the source claim. Source: ${sourceSummary}. Candidates: ${candidatesSummary}.

Return JSON: { "duplicates": [{ "claimId": "string", "claimNumber": "string", "matchScore": number (0-1), "matchFields": ["string"] }] }`;
    const result = await generateJSON<{ duplicates: Array<{ claimId: string; claimNumber: string; matchScore: number; matchFields: string[] }> }>(prompt);
    res.json({ duplicates: result.duplicates || [] });
  } catch (err) {
    next(err);
  }
});
