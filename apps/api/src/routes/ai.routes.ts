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

export const aiRouter: Router = Router();

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

// --- Agent status and monitoring ---
aiRouter.get('/status', aiController.getAgentStatus);
aiRouter.get('/history', aiController.getAgentHistory);
