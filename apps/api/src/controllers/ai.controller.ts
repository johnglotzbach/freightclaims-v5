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
  getConversation: asyncHandler(async (req, res) => { res.json(await aiService.getConversation(req.params.id)); }),
  deleteConversation: asyncHandler(async (req, res) => { await aiService.deleteConversation(req.params.id); res.status(204).send(); }),

  // Agent status
  getAgentStatus: asyncHandler(async (_req, res) => { res.json(await aiService.getAgentStatus()); }),
  getAgentHistory: asyncHandler(async (req, res) => { res.json(await aiService.getAgentHistory(req.query)); }),
};
