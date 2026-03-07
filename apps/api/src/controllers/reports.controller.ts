/**
 * Reports Controller - Insights, analytics, and export endpoints
 *
 * Location: apps/api/src/controllers/reports.controller.ts
 * Related: apps/api/src/services/reports.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { reportsService } from '../services/reports.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const reportsController = {
  getDashboard: asyncHandler(async (req, res) => {
    const user = getUser(req);
    const tenant = req.tenant;
    const effectiveCorp = tenant?.effectiveCorporateId ?? user.corporateId ?? null;
    const isSuperAdmin = tenant?.isSuperAdmin ?? false;
    res.json(await reportsService.getDashboard(user, isSuperAdmin && !effectiveCorp ? null : effectiveCorp));
  }),
  getInsightsReport: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await reportsService.getInsightsReport(req.body, user)); }),
  getTopCustomers: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await reportsService.getTopCustomers(req.body, user)); }),
  getTopCarriers: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await reportsService.getTopCarriers(req.body, user)); }),
  getCollectionPercentage: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await reportsService.getCollectionPercentage(req.body, user)); }),
  getMetricsPerCarrier: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await reportsService.getMetricsPerCarrier(req.body, user)); }),
  getMetricsPerDestination: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await reportsService.getMetricsPerDestination(req.body, user)); }),
  getWriteOffAmount: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await reportsService.getWriteOffAmount(req.body, user)); }),
  exportReport: asyncHandler(async (req, res) => { const user = getUser(req); await reportsService.exportReport(req.params.type as string, req.query, user, res); }),
};
