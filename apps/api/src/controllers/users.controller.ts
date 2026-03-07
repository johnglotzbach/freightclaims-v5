/**
 * Users Controller - Request handling for auth and user management
 *
 * Location: apps/api/src/controllers/users.controller.ts
 * Related: apps/api/src/services/users.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { usersService } from '../services/users.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const usersController = {
  login: asyncHandler(async (req, res) => {
    const result = await usersService.login(req.body);
    res.json(result);
  }),

  register: asyncHandler(async (req, res) => {
    const user = await usersService.register(req.body);
    res.status(201).json(user);
  }),

  refreshToken: asyncHandler(async (req, res) => {
    const result = await usersService.refreshToken(req.body.refreshToken);
    res.json(result);
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await usersService.forgotPassword(req.body.email);
    res.json({ message: 'Password reset email sent' });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await usersService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ message: 'Password updated successfully' });
  }),

  getCurrentUser: asyncHandler(async (req, res) => {
    const user = await usersService.getById(getUser(req).userId);
    res.json(user);
  }),

  updateCurrentUser: asyncHandler(async (req, res) => {
    const user = await usersService.update(getUser(req).userId, req.body);
    res.json(user);
  }),

  changePassword: asyncHandler(async (req, res) => {
    await usersService.changePassword(getUser(req).userId, req.body);
    res.json({ message: 'Password changed' });
  }),

  getPreferences: asyncHandler(async (req, res) => {
    const prefs = await usersService.getPreferences(getUser(req).userId);
    res.json(prefs);
  }),

  updatePreferences: asyncHandler(async (req, res) => {
    const prefs = await usersService.updatePreferences(getUser(req).userId, req.body);
    res.json(prefs);
  }),

  list: asyncHandler(async (req, res) => {
    const result = await usersService.list(req.query);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const user = await usersService.getById(req.params.id as string);
    res.json(user);
  }),

  create: asyncHandler(async (req, res) => {
    const user = await usersService.register(req.body);
    res.status(201).json(user);
  }),

  update: asyncHandler(async (req, res) => {
    const user = await usersService.update(req.params.id as string, req.body);
    res.json(user);
  }),

  delete: asyncHandler(async (req, res) => {
    await usersService.delete(req.params.id as string);
    res.status(204).send();
  }),

  getRoles: asyncHandler(async (_req, res) => {
    const roles = await usersService.getRoles();
    res.json(roles);
  }),

  createRole: asyncHandler(async (req, res) => {
    const role = await usersService.createRole(req.body);
    res.status(201).json(role);
  }),

  updateRole: asyncHandler(async (req, res) => {
    const role = await usersService.updateRole(req.params.id as string, req.body);
    res.json(role);
  }),

  getPermissions: asyncHandler(async (_req, res) => {
    const perms = await usersService.getPermissions();
    res.json(perms);
  }),

  updatePermission: asyncHandler(async (req, res) => {
    const perm = await usersService.updatePermission(req.params.id as string, req.body);
    res.json(perm);
  }),

  getEmailTemplates: asyncHandler(async (_req, res) => {
    const templates = await usersService.getEmailTemplates();
    res.json(templates);
  }),

  createEmailTemplate: asyncHandler(async (req, res) => {
    const template = await usersService.createEmailTemplate(req.body);
    res.status(201).json(template);
  }),

  updateEmailTemplate: asyncHandler(async (req, res) => {
    const template = await usersService.updateEmailTemplate(req.params.id as string, req.body);
    res.json(template);
  }),

  getLetterTemplates: asyncHandler(async (_req, res) => {
    const templates = await usersService.getLetterTemplates();
    res.json(templates);
  }),

  createLetterTemplate: asyncHandler(async (req, res) => {
    const template = await usersService.createLetterTemplate(req.body);
    res.status(201).json(template);
  }),

  updateLetterTemplate: asyncHandler(async (req, res) => {
    const template = await usersService.updateLetterTemplate(req.params.id as string, req.body);
    res.json(template);
  }),
};
