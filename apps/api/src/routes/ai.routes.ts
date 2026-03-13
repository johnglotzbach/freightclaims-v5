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

    const carrierParties = claim.parties.filter((p: any) => p.type === 'carrier');
    const claimantParties = claim.parties.filter((p: any) => p.type === 'claimant' || p.type === 'shipper' || p.type === 'consignee');

    const filingDate = (claim as any).filingDate ? new Date((claim as any).filingDate) : null;
    const now = new Date();
    const daysSinceFiling = filingDate ? Math.floor((now.getTime() - filingDate.getTime()) / 86400000) : null;
    const claimAgeDays = Math.floor((now.getTime() - new Date(claim.createdAt).getTime()) / 86400000);

    const emailHistory = claim.emailLogs.map((e: any) => ({
      subject: e.subject,
      direction: e.direction,
      date: e.createdAt,
      to: e.to,
      from: e.from,
    }));

    const claimSnapshot = {
      claimNumber: claim.claimNumber,
      proNumber: claim.proNumber,
      status: claim.status,
      claimType: claim.claimType,
      claimAmount: Number(claim.claimAmount),
      description: claim.description,
      createdAt: claim.createdAt,
      claimAgeDays,
      filingDate: filingDate?.toISOString().split('T')[0] || null,
      daysSinceFiling,
      acknowledgmentDate: (claim as any).acknowledgmentDate || null,
      reserveAmount: (claim as any).reserveAmount ? Number((claim as any).reserveAmount) : null,
      customer: (claim as any).customer,
      carrierParties: carrierParties.map((p: any) => ({
        name: p.name, email: p.email, scacCode: p.scacCode, phone: p.phone,
        filingStatus: p.filingStatus, carrierClaimNumber: p.carrierClaimNumber,
        carrierResponse: p.carrierResponse,
      })),
      claimantParties: claimantParties.map((p: any) => ({
        name: p.name, email: p.email, phone: p.phone,
      })),
      products: claim.products.map((p: any) => ({
        description: p.description, quantity: p.quantity, weight: p.weight,
        claimAmount: p.claimAmount ? Number(p.claimAmount) : null,
        condition: p.condition, sku: p.sku,
      })),
      documents: claim.documents.map((d: any) => ({
        name: d.documentName, category: d.category,
      })),
      tasks: claim.tasks.filter((t: any) => t.status !== 'completed').map((t: any) => ({
        title: t.title, priority: t.priority, dueDate: t.dueDate,
      })),
      deadlines: claim.deadlines?.map((d: any) => ({
        type: d.type, dueDate: d.dueDate,
      })) || [],
      recentComments: claim.comments.slice(-5).map((c: any) => ({
        content: c.content, createdAt: c.createdAt, isInternal: c.isInternal,
      })),
      emailHistory: emailHistory.slice(0, 10),
    };

    const prompt = `You are an expert freight claims professional. Analyze this claim thoroughly and compose the most appropriate email.

CLAIM DATA:
${JSON.stringify(claimSnapshot, null, 2)}

${context ? `USER CONTEXT: ${context}` : ''}
${replyTo ? `REPLYING TO: ${replyTo}` : ''}

INSTRUCTIONS:
1. Analyze the claim status, age, parties, products, documents, email history, and deadlines
2. Determine what type of email is most appropriate right now:
   - If no emails sent yet and claim is new: initial claim filing notification to carrier
   - If filed but no acknowledgment after 15+ days: follow-up requesting acknowledgment
   - If acknowledged but no resolution after 60+ days: escalation / demand for disposition
   - If carrier denied: appeal/rebuttal citing Carmack Amendment
   - If settlement offered: acceptance/counter-offer
   - If claim resolved: closing confirmation
   - If documents are missing: request for documentation
   - Otherwise: professional status update or follow-up
3. Address the email to the correct carrier contact(s)
4. Include all relevant claim identifiers (claim #, PRO #, carrier claim # if available)
5. Reference specific dollar amounts, commodities, and damage details
6. Be firm but professional. Cite Carmack Amendment timing requirements where relevant
7. Include a clear call to action

Return JSON: { "subject": "string", "body": "string", "to": ["email@example.com"], "cc": ["optional@cc.com"], "emailType": "filing|follow_up|escalation|appeal|settlement|closing|document_request|status_update" }

The body should be professional plain text with proper greeting and sign-off.`;

    const result = await generateJSON<{ subject: string; body: string; to?: string[]; cc?: string[]; emailType?: string }>(prompt, {
      systemInstruction: 'You are a senior freight claims adjuster with 20 years experience. Draft emails that are professional, assertive, and legally sound. Always reference specific claim details. Follow Carmack Amendment timing requirements.',
    });

    const toRecipients = result.to?.length ? result.to : carrierParties.map((p: any) => p.email).filter(Boolean);

    res.json({
      subject: result.subject || '',
      body: result.body || '',
      to: toRecipients,
      cc: result.cc || [],
      emailType: result.emailType || 'status_update',
    });
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
