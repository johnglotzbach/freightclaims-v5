/**
 * Automation Routes - Business rules engine and automated workflows
 *
 * Manages automation rules, email/letter templates, and scheduled job
 * configurations for automated claim lifecycle actions.
 *
 * Location: apps/api/src/routes/automation.routes.ts
 * Related: apps/api/src/controllers/automation.controller.ts
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { automationController } from '../controllers/automation.controller';

export const automationRouter: Router = Router();

automationRouter.use(authenticate);

// --- Automation rules ---
automationRouter.get('/rules', automationController.listRules);
automationRouter.get('/rules/:id', automationController.getRuleById);
automationRouter.post('/rules', authorize(['admin']), automationController.createRule);
automationRouter.put('/rules/:id', authorize(['admin']), automationController.updateRule);
automationRouter.delete('/rules/:id', authorize(['admin']), automationController.deleteRule);

// --- Automation templates ---
automationRouter.get('/templates', automationController.listTemplates);
automationRouter.post('/templates', authorize(['admin']), automationController.createTemplate);
automationRouter.put('/templates/:id', authorize(['admin']), automationController.updateTemplate);
automationRouter.delete('/templates/:id', authorize(['admin']), automationController.deleteTemplate);

// --- Trigger automation manually ---
automationRouter.post('/trigger/:ruleId', authorize(['admin', 'manager']), automationController.triggerRule);
