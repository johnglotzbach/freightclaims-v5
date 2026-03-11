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
import { authenticate } from '../middleware/auth.middleware';
import { aiController } from '../controllers/ai.controller';
import { env } from '../config/env';
import { generateContent } from '../services/agents/gemini-client';
import { logger } from '../utils/logger';

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

// --- Agent status and monitoring ---
aiRouter.get('/status', aiController.getAgentStatus);
aiRouter.get('/history', aiController.getAgentHistory);
