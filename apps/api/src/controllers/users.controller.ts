/**
 * Users Controller - Request handling for auth and user management
 *
 * Location: apps/api/src/controllers/users.controller.ts
 * Related: apps/api/src/services/users.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { usersService } from '../services/users.service';
import { prisma } from '../config/database';
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
    const user = getUser(req);
    const result = await usersService.list(req.query, user);
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

  deleteRole: asyncHandler(async (req, res) => {
    await usersService.deleteRole(req.params.id as string);
    res.status(204).send();
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

  deleteEmailTemplate: asyncHandler(async (req, res) => {
    await usersService.deleteEmailTemplate(req.params.id as string);
    res.status(204).send();
  }),

  deleteLetterTemplate: asyncHandler(async (req, res) => {
    await usersService.deleteLetterTemplate(req.params.id as string);
    res.status(204).send();
  }),

  getApiKeys: asyncHandler(async (req, res) => {
    const user = getUser(req);
    if (!user.corporateId) {
      res.json([]);
      return;
    }
    const keys = await prisma.apiKey.findMany({
      where: { corporateId: user.corporateId },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys);
  }),

  createApiKey: asyncHandler(async (req, res) => {
    const user = getUser(req);
    if (!user.corporateId) {
      res.status(400).json({ error: 'No workspace context' });
      return;
    }
    const { name, expiresAt } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const rawKey = crypto.randomBytes(32).toString('hex');
    const prefix = rawKey.substring(0, 8);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.userId,
        corporateId: user.corporateId,
        name,
        keyHash,
        prefix,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: { id: true, name: true, prefix: true, createdAt: true, expiresAt: true },
    });

    res.status(201).json({ ...apiKey, key: rawKey });
  }),

  deleteApiKey: asyncHandler(async (req, res) => {
    const user = getUser(req);
    if (!user.corporateId) {
      res.status(400).json({ error: 'No workspace context' });
      return;
    }
    const { id } = req.params;
    const existing = await prisma.apiKey.findFirst({ where: { id, corporateId: user.corporateId } });
    if (!existing) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    await prisma.apiKey.delete({ where: { id } });
    res.status(204).send();
  }),

  getWebhooks: asyncHandler(async (req, res) => {
    const user = getUser(req);
    if (!user.corporateId) {
      res.json([]);
      return;
    }
    const configs = await prisma.webhookConfig.findMany({
      where: { corporateId: user.corporateId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(configs);
  }),

  saveWebhookConfig: asyncHandler(async (req, res) => {
    const user = getUser(req);
    if (!user.corporateId) {
      res.status(400).json({ error: 'No workspace context' });
      return;
    }
    const { url, secret, events, isActive } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'events array is required' });
      return;
    }
    const generatedSecret = secret || crypto.randomBytes(32).toString('hex');
    const config = await prisma.webhookConfig.create({
      data: {
        corporateId: user.corporateId,
        url,
        secret: generatedSecret,
        events,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(config);
  }),

  updateWebhookConfig: asyncHandler(async (req, res) => {
    const user = getUser(req);
    if (!user.corporateId) {
      res.status(400).json({ error: 'No workspace context' });
      return;
    }
    const { id } = req.params;
    const existing = await prisma.webhookConfig.findFirst({ where: { id, corporateId: user.corporateId } });
    if (!existing) {
      res.status(404).json({ error: 'Webhook config not found' });
      return;
    }
    const { url, secret, events, isActive } = req.body;
    const updated = await prisma.webhookConfig.update({
      where: { id },
      data: {
        ...(url && { url }),
        ...(secret && { secret }),
        ...(events && { events }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(updated);
  }),

  deleteWebhookConfig: asyncHandler(async (req, res) => {
    const user = getUser(req);
    if (!user.corporateId) {
      res.status(400).json({ error: 'No workspace context' });
      return;
    }
    const { id } = req.params;
    const existing = await prisma.webhookConfig.findFirst({ where: { id, corporateId: user.corporateId } });
    if (!existing) {
      res.status(404).json({ error: 'Webhook config not found' });
      return;
    }
    await prisma.webhookConfig.delete({ where: { id } });
    res.status(204).send();
  }),

  onboarding: asyncHandler(async (req, res) => {
    const user = getUser(req);
    const { workspace, preferences } = req.body;

    if (workspace?.companyName && user.corporateId) {
      const { prisma } = await import('../config/database');
      await prisma.customer.update({
        where: { id: user.corporateId },
        data: { name: workspace.companyName },
      }).catch(() => {});
    }

    if (preferences) {
      const safePrefs: Record<string, unknown> = {};
      if (typeof preferences.emailNotifications === 'boolean') safePrefs.emailNotifications = preferences.emailNotifications;
      if (typeof preferences.pushNotifications === 'boolean') safePrefs.pushNotifications = preferences.pushNotifications;
      if (typeof preferences.dailyDigest === 'boolean') safePrefs.dailyDigest = preferences.dailyDigest;
      if (typeof preferences.theme === 'string') safePrefs.theme = preferences.theme;
      if (typeof preferences.timezone === 'string') safePrefs.timezone = preferences.timezone;
      if (Object.keys(safePrefs).length > 0) {
        await usersService.updatePreferences(user.userId, safePrefs);
      }
    }

    res.json({ message: 'Onboarding complete' });
  }),

  setupTwoFactor: asyncHandler(async (req, res) => {
    const result = await usersService.setupTwoFactor(getUser(req).userId);
    res.json(result);
  }),

  verifyAndEnableTwoFactor: asyncHandler(async (req, res) => {
    const { code } = req.body;
    const result = await usersService.verifyAndEnableTwoFactor(getUser(req).userId, code);
    res.json(result);
  }),

  disableTwoFactor: asyncHandler(async (req, res) => {
    const { password } = req.body;
    const result = await usersService.disableTwoFactor(getUser(req).userId, password);
    res.json(result);
  }),

  adminResetPassword: asyncHandler(async (req, res) => {
    await usersService.adminResetPassword(req.params.id as string);
    res.json({ message: 'Password has been reset. A temporary password has been generated.' });
  }),

  invite: asyncHandler(async (req, res) => {
    const user = getUser(req);
    const corporateId = user.corporateId;
    if (!corporateId) {
      res.status(400).json({ success: false, error: 'No workspace context. Cannot invite users.' });
      return;
    }
    const invited = await usersService.inviteToWorkspace(req.body, corporateId);
    res.status(201).json(invited);
  }),
};

export async function dispatchWebhook(corporateId: string, event: string, payload: unknown) {
  const configs = await prisma.webhookConfig.findMany({
    where: { corporateId, isActive: true, events: { has: event } },
  });
  for (const config of configs) {
    try {
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
      const signature = crypto.createHmac('sha256', config.secret).update(body).digest('hex');
      await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
        body,
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Log but don't fail — webhook delivery is best-effort
    }
  }
}
