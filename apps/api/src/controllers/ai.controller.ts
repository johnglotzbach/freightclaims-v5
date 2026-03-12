/**
 * AI Controller - Request handling for AI agent endpoints and copilot
 *
 * Routes AI requests to the appropriate specialized agent or copilot service.
 * Each agent endpoint accepts domain-specific input and returns structured results.
 *
 * Location: apps/api/src/controllers/ai.controller.ts
 * Related: apps/ai-agent/src/ (agent implementations)
 *          apps/api/src/services/ai.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';
import type { JwtPayload } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const aiController = {
  // Specialized agent endpoints
  runIntakeAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('intake', req.body, getUser(req))); }),
  runComplianceAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('compliance', req.body, getUser(req))); }),
  runNegotiationAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('negotiation', req.body, getUser(req))); }),
  runValuationAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('valuation', req.body, getUser(req))); }),
  runDocumentsAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('documents', req.body, getUser(req))); }),
  runFollowUpAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('followup', req.body, getUser(req))); }),
  runPredictorAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('predictor', req.body, getUser(req))); }),
  runRiskAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('risk', req.body, getUser(req))); }),
  runFraudAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('fraud', req.body, getUser(req))); }),
  runDenialAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('denial', req.body, getUser(req))); }),
  runCommunicationAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('communication', req.body, getUser(req))); }),
  runRootCauseAgent: asyncHandler(async (req, res) => { res.json(await aiService.runAgent('rootcause', req.body, getUser(req))); }),

  // Copilot (conversational)
  chat: asyncHandler(async (req, res) => { res.json(await aiService.chat(req.body, getUser(req))); }),
  getConversations: asyncHandler(async (req, res) => { res.json(await aiService.getConversations(getUser(req).userId)); }),
  getConversation: asyncHandler(async (req, res) => {
    const user = getUser(req);
    const convo = await aiService.getConversation(req.params.id as string, user.userId);
    if (!convo) { res.status(404).json({ error: 'Conversation not found' }); return; }
    res.json(convo);
  }),
  deleteConversation: asyncHandler(async (req, res) => {
    const user = getUser(req);
    await aiService.deleteConversation(req.params.id as string, user.userId);
    res.status(204).send();
  }),

  // AI-processed documents for the AI Entry page
  getAIDocuments: asyncHandler(async (req, res) => {
    const user = getUser(req);

    let whereClause: any = {};
    if (!user.isSuperAdmin && user.corporateId) {
      whereClause = {
        OR: [
          { claim: { corporateId: user.corporateId } },
          { claimId: null },
        ],
      };
    }

    const aiDocs = await prisma.aiDocument.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        claim: { select: { id: true, claimNumber: true, corporateId: true } },
      },
    });

    const docs = await Promise.all(
      aiDocs.map(async (ad: any) => {
        let doc = null;
        if (ad.documentId) {
          doc = await prisma.claimDocument.findUnique({
            where: { id: ad.documentId },
            select: { documentName: true, mimeType: true, s3Key: true },
          });
        }
        const extracted = ad.extractedData as any;
        return {
          id: ad.id,
          documentId: ad.documentId,
          documentName: doc?.documentName || 'Unknown Document',
          mimeType: doc?.mimeType || 'application/octet-stream',
          category: extracted?.category || ad.agentType,
          confidence: Number(ad.confidence) || 0,
          status: ad.status,
          extractedFields: extracted?.extractedFields || [],
          summary: extracted?.summary || '',
          claimId: ad.claimId,
          claimNumber: ad.claim?.claimNumber,
          createdAt: ad.createdAt,
        };
      }),
    );

    res.json(docs);
  }),

  deleteAIDocument: asyncHandler(async (req, res) => {
    const user = getUser(req);
    const aiDocId = req.params.id as string;

    const aiDoc = await prisma.aiDocument.findUnique({ where: { id: aiDocId } });
    if (!aiDoc) {
      res.status(404).json({ error: 'AI document not found' });
      return;
    }

    if (aiDoc.documentId) {
      const claimDoc = await prisma.claimDocument.findUnique({
        where: { id: aiDoc.documentId },
        include: { claim: { select: { corporateId: true } } },
      });

      if (claimDoc) {
        if (!user.isSuperAdmin && claimDoc.claim?.corporateId && claimDoc.claim.corporateId !== user.corporateId) {
          res.status(404).json({ error: 'AI document not found' });
          return;
        }

        if (claimDoc.s3Key) {
          const { storageService } = await import('../services/storage.service');
          await storageService.deleteDocument(claimDoc.s3Key).catch(() => {});
        }
        const thumbKey = (claimDoc as any).thumbnailKey;
        if (thumbKey) {
          const { storageService } = await import('../services/storage.service');
          await storageService.deleteDocument(thumbKey).catch(() => {});
        }

        await prisma.claimDocument.delete({ where: { id: claimDoc.id } }).catch(() => {});
      }
    }

    await prisma.aiDocument.delete({ where: { id: aiDocId } });
    res.status(204).send();
  }),

  // Agent status
  getAgentStatus: asyncHandler(async (req, res) => { res.json(await aiService.getAgentStatus(getUser(req))); }),
  getAgentHistory: asyncHandler(async (req, res) => { res.json(await aiService.getAgentHistory(req.query, getUser(req))); }),
};
