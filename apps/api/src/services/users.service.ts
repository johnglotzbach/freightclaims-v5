/**
 * UsersService - Authentication, user management, roles, and permissions
 *
 * Handles login/register flows, JWT issuance and refresh, password management,
 * user CRUD, role-based access, and template management. All password hashing
 * uses bcrypt with a work factor of 12.
 *
 * Location: apps/api/src/services/users.service.ts
 * Related: apps/api/src/repositories/users.repository.ts
 *          apps/api/src/config/env.ts (JWT_SECRET)
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersRepository } from '../repositories/users.repository';
import { env } from '../config/env';
import { generateToken, generateRefreshToken } from '../middleware/auth.middleware';
import type { JwtPayload } from '../middleware/auth.middleware';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

const BCRYPT_ROUNDS = 12;

/**
 * Builds a complete JWT payload from a user record (including role + permissions).
 * The repository includes role.permissions via Prisma `include`.
 */
function buildJwtPayload(user: Record<string, unknown>): JwtPayload {
  const role = user.role as { permissions?: { permission: { name: string } }[] } | null;
  const permissions = role?.permissions?.map((rp) => rp.permission.name) ?? [];

  return {
    userId: user.id as string,
    email: user.email as string,
    role: (user.roleName as string) || (role as any)?.name || 'user',
    roleId: (user.roleId as string) || null,
    corporateId: (user.corporateId as string) || null,
    customerId: (user.customerId as string) || null,
    isSuperAdmin: (user.isSuperAdmin as boolean) || false,
    permissions,
  };
}

/** Strips sensitive fields before returning user data to the client */
function safeUser(user: Record<string, unknown>) {
  const { passwordHash: _pw, ...safe } = user;
  return {
    ...safe,
    permissions: buildJwtPayload(user).permissions,
  };
}

export const usersService = {
  /**
   * Authenticates a user with email/password and returns JWT tokens.
   * The access token carries the full JwtPayload (corporateId, permissions, etc.)
   * so middleware can enforce tenant isolation and RBAC without DB hits.
   */
  async login(credentials: { email: string; password: string }) {
    const user = await usersRepository.findByEmail(credentials.email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    if (!user.isActive) throw new UnauthorizedError('Account is suspended. Contact support@freightclaims.com.');

    const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedError('Invalid email or password');

    const payload = buildJwtPayload(user as unknown as Record<string, unknown>);
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(user.id);

    await usersRepository.update(user.id, { lastLoginAt: new Date() });

    logger.info({ userId: user.id }, 'User logged in');

    return { accessToken, refreshToken, user: safeUser(user as unknown as Record<string, unknown>) };
  },

  /** Registers a new user account with hashed password */
  async register(data: Record<string, unknown>) {
    const existing = await usersRepository.findByEmail(data.email as string);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password as string, BCRYPT_ROUNDS);
    const { password: _pw, ...rest } = data;
    const user = await usersRepository.create({ ...rest, passwordHash });

    return safeUser(user as unknown as Record<string, unknown>);
  },

  /** Issues a new access token using a valid refresh token */
  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; type: string };
      if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

      const user = await usersRepository.findById(decoded.userId);
      if (!user) throw new UnauthorizedError('User not found');

      const payload = buildJwtPayload(user as unknown as Record<string, unknown>);
      const accessToken = generateToken(payload);

      return { accessToken };
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
  },

  /** Sends a password reset email with a time-limited token */
  async forgotPassword(email: string) {
    const user = await usersRepository.findByEmail(email);
    if (!user) return;

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password-reset' },
      env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    await usersRepository.update(user.id, {
      resetToken,
      resetTokenExpiresAt: new Date(Date.now() + 3600_000),
    });

    logger.info({ email }, 'Password reset token generated');
  },

  /** Resets password using a valid reset token */
  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; purpose: string };
      if (decoded.purpose !== 'password-reset') throw new UnauthorizedError('Invalid reset token');

      const user = await usersRepository.findById(decoded.userId);
      if (!user) throw new NotFoundError('User not found');

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await usersRepository.update(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      });

      logger.info({ userId: user.id }, 'Password reset completed');
    } catch {
      throw new UnauthorizedError('Invalid or expired reset token');
    }
  },

  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return safeUser(user as unknown as Record<string, unknown>);
  },

  async update(id: string, data: Record<string, unknown>) {
    return usersRepository.update(id, data);
  },

  async delete(id: string) {
    return usersRepository.softDelete(id);
  },

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
    return usersRepository.update(userId, { passwordHash });
  },

  async list(query: Record<string, unknown>) { return usersRepository.findMany(query); },
  async getPreferences(userId: string) { return usersRepository.getPreferences(userId); },
  async updatePreferences(userId: string, data: Record<string, unknown>) { return usersRepository.updatePreferences(userId, data); },
  async getRoles() { return usersRepository.getRoles(); },
  async createRole(data: Record<string, unknown>) { return usersRepository.createRole(data); },
  async updateRole(id: string, data: Record<string, unknown>) { return usersRepository.updateRole(id, data); },
  async getPermissions() { return usersRepository.getPermissions(); },
  async updatePermission(id: string, data: Record<string, unknown>) { return usersRepository.updatePermission(id, data); },
  async getEmailTemplates() { return usersRepository.getEmailTemplates(); },
  async createEmailTemplate(data: Record<string, unknown>) { return usersRepository.createEmailTemplate(data); },
  async updateEmailTemplate(id: string, data: Record<string, unknown>) { return usersRepository.updateEmailTemplate(id, data); },
  async getLetterTemplates() { return usersRepository.getLetterTemplates(); },
  async createLetterTemplate(data: Record<string, unknown>) { return usersRepository.createLetterTemplate(data); },
  async updateLetterTemplate(id: string, data: Record<string, unknown>) { return usersRepository.updateLetterTemplate(id, data); },
};
