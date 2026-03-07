/**
 * Email Controller - Request handling for email and notification endpoints
 *
 * Location: apps/api/src/controllers/email.controller.ts
 * Related: apps/api/src/services/email.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const emailController = {
  send: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await emailService.send(req.body, user)); }),
  getByClaimId: asyncHandler(async (req, res) => { res.json(await emailService.getByClaimId(req.params.claimId as string)); }),
  getNotifications: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await emailService.getNotifications(user.userId)); }),
  getUnreadCount: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await emailService.getUnreadCount(user.userId)); }),
  markAsRead: asyncHandler(async (req, res) => { res.json(await emailService.markAsRead(req.params.id as string)); }),
  markAllAsRead: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await emailService.markAllAsRead(user.userId)); }),
  getPreferences: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await emailService.getPreferences(user.userId)); }),
  updatePreferences: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await emailService.updatePreferences(user.userId, req.body)); }),
  processQueue: asyncHandler(async (_req, res) => { res.json(await emailService.processQueue()); }),
};
