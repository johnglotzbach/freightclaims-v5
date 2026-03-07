/**
 * Automation Controller - Business rule engine and workflow management
 *
 * Location: apps/api/src/controllers/automation.controller.ts
 * Related: apps/api/src/services/automation.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { automationService } from '../services/automation.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const automationController = {
  listRules: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await automationService.listRules(user)); }),
  getRuleById: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await automationService.getRuleById(req.params.id as string, user)); }),
  createRule: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await automationService.createRule(req.body, user)); }),
  updateRule: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await automationService.updateRule(req.params.id as string, req.body, user)); }),
  deleteRule: asyncHandler(async (req, res) => { const user = getUser(req); await automationService.deleteRule(req.params.id as string, user); res.status(204).send(); }),
  listTemplates: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await automationService.listTemplates(user)); }),
  createTemplate: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await automationService.createTemplate(req.body, user)); }),
  updateTemplate: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await automationService.updateTemplate(req.params.id as string, req.body, user)); }),
  deleteTemplate: asyncHandler(async (req, res) => { const user = getUser(req); await automationService.deleteTemplate(req.params.id as string, user); res.status(204).send(); }),
  triggerRule: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await automationService.triggerRule(req.params.ruleId as string, user)); }),
};
