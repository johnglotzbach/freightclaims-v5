/**
 * Automation Controller - Business rule engine and workflow management
 *
 * Location: apps/api/src/controllers/automation.controller.ts
 * Related: apps/api/src/services/automation.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { automationService } from '../services/automation.service';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const automationController = {
  listRules: asyncHandler(async (_req, res) => { res.json(await automationService.listRules()); }),
  getRuleById: asyncHandler(async (req, res) => { res.json(await automationService.getRuleById(req.params.id)); }),
  createRule: asyncHandler(async (req, res) => { res.status(201).json(await automationService.createRule(req.body)); }),
  updateRule: asyncHandler(async (req, res) => { res.json(await automationService.updateRule(req.params.id, req.body)); }),
  deleteRule: asyncHandler(async (req, res) => { await automationService.deleteRule(req.params.id); res.status(204).send(); }),
  listTemplates: asyncHandler(async (_req, res) => { res.json(await automationService.listTemplates()); }),
  createTemplate: asyncHandler(async (req, res) => { res.status(201).json(await automationService.createTemplate(req.body)); }),
  updateTemplate: asyncHandler(async (req, res) => { res.json(await automationService.updateTemplate(req.params.id, req.body)); }),
  deleteTemplate: asyncHandler(async (req, res) => { await automationService.deleteTemplate(req.params.id); res.status(204).send(); }),
  triggerRule: asyncHandler(async (req, res) => { res.json(await automationService.triggerRule(req.params.ruleId)); }),
};
