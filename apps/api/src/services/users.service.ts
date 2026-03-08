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
import { prisma } from '../config/database';
import { env } from '../config/env';
import { generateToken, generateRefreshToken } from '../middleware/auth.middleware';
import type { JwtPayload } from '../middleware/auth.middleware';
import { UnauthorizedError, NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { smtpService } from './smtp.service';

const BCRYPT_ROUNDS = 12;

function validatePasswordComplexity(password: string): void {
  const issues: string[] = [];
  if (password.length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) issues.push('at least 1 uppercase letter');
  if (!/[a-z]/.test(password)) issues.push('at least 1 lowercase letter');
  if (!/[0-9]/.test(password)) issues.push('at least 1 number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) issues.push('at least 1 special character');
  if (issues.length > 0) {
    throw new BadRequestError(`Password must contain: ${issues.join(', ')}`);
  }
}

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

/** Strips sensitive fields and Prisma relation objects before returning user data to the client */
function safeUser(user: Record<string, unknown>) {
  const { passwordHash: _pw, role: rawRole, corporate: rawCorporate, ...safe } = user;
  const role = rawRole as Record<string, unknown> | null;
  const corporate = rawCorporate as Record<string, unknown> | null;
  return {
    ...safe,
    role: (role?.name as string) || 'User',
    roleId: safe.roleId ?? (role?.id as string) ?? null,
    roleName: (role?.name as string) || null,
    corporateName: corporate?.name || null,
    corporateCode: corporate?.code || null,
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

  /** Registers a new user account with hashed password and auto-creates a workspace */
  async register(data: Record<string, unknown>) {
    const existing = await usersRepository.findByEmail(data.email as string);
    if (existing) throw new ConflictError('Email already registered');

    validatePasswordComplexity(data.password as string);
    const passwordHash = await bcrypt.hash(data.password as string, BCRYPT_ROUNDS);

    let corporateId: string | null = null;
    let roleId: string | null = null;

    const companyName = data.companyName as string | undefined;
    if (companyName) {
      const code = `WS-${Date.now().toString(36).toUpperCase()}`;
      const workspace = await prisma.customer.create({
        data: {
          name: companyName,
          code,
          email: data.email as string,
          isCorporate: true,
          isActive: true,
        } as any,
      });
      corporateId = workspace.id;

      const adminRole = await prisma.role.findFirst({ where: { name: 'Admin', corporateId: null } });
      if (adminRole) roleId = adminRole.id;
    }

    const { password: _pw, companyName: _cn, jobTitle: _jt, companySize: _cs, ...rest } = data;
    const user = await usersRepository.create({
      ...rest,
      passwordHash,
      corporateId,
      roleId,
    });

    await smtpService.sendWelcome({
      to: data.email as string,
      userName: (data.firstName as string) || (data.email as string),
      loginUrl: `${env.NEXT_PUBLIC_APP_URL}/login`,
    }).catch((err) => logger.error({ err }, 'Failed to send welcome email'));

    logger.info({ userId: (user as any).id, corporateId, companyName }, 'New user registered with workspace');

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

    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    await smtpService.sendPasswordReset({
      to: user.email,
      resetUrl,
      userName: (user as any).firstName || user.email,
    }).catch((err) => logger.error({ err, email }, 'Failed to send password reset email'));

    logger.info({ email }, 'Password reset token generated');
  },

  /** Resets password using a valid reset token */
  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; purpose: string };
      if (decoded.purpose !== 'password-reset') throw new UnauthorizedError('Invalid reset token');

      const user = await usersRepository.findById(decoded.userId);
      if (!user) throw new NotFoundError('User not found');

      validatePasswordComplexity(newPassword);
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
    const { timezone, ...userData } = data;
    if (timezone) {
      await prisma.userPreference.upsert({
        where: { userId: id },
        update: { timezone: String(timezone) },
        create: { userId: id, timezone: String(timezone) },
      }).catch(() => {});
    }
    const userFields: Record<string, unknown> = {};
    if (userData.firstName !== undefined) userFields.firstName = userData.firstName;
    if (userData.lastName !== undefined) userFields.lastName = userData.lastName;
    if (userData.email !== undefined) userFields.email = userData.email;
    if (userData.phone !== undefined) userFields.phone = userData.phone;
    if (Object.keys(userFields).length > 0) {
      return usersRepository.update(id, userFields);
    }
    return usersRepository.findById(id);
  },

  async delete(id: string) {
    return usersRepository.softDelete(id);
  },

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    validatePasswordComplexity(data.newPassword);
    const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
    return usersRepository.update(userId, { passwordHash });
  },

  async list(query: Record<string, unknown>, user?: { corporateId?: string | null; isSuperAdmin?: boolean }) {
    return usersRepository.findMany(query, user?.corporateId, user?.isSuperAdmin);
  },
  async getPreferences(userId: string) { return usersRepository.getPreferences(userId); },
  async updatePreferences(userId: string, data: Record<string, unknown>) { return usersRepository.updatePreferences(userId, data); },
  async getRoles() { return usersRepository.getRoles(); },
  async createRole(data: Record<string, unknown>) { return usersRepository.createRole(data); },
  async updateRole(id: string, data: Record<string, unknown>) { return usersRepository.updateRole(id, data); },
  async deleteRole(id: string) { return usersRepository.deleteRole(id); },
  async getPermissions() { return usersRepository.getPermissions(); },
  async updatePermission(id: string, data: Record<string, unknown>) { return usersRepository.updatePermission(id, data); },
  async getEmailTemplates() { return usersRepository.getEmailTemplates(); },
  async createEmailTemplate(data: Record<string, unknown>) { return usersRepository.createEmailTemplate(data); },
  async updateEmailTemplate(id: string, data: Record<string, unknown>) { return usersRepository.updateEmailTemplate(id, data); },
  async getLetterTemplates() { return usersRepository.getLetterTemplates(); },
  async createLetterTemplate(data: Record<string, unknown>) { return usersRepository.createLetterTemplate(data); },
  async updateLetterTemplate(id: string, data: Record<string, unknown>) { return usersRepository.updateLetterTemplate(id, data); },
  async deleteEmailTemplate(id: string) { return usersRepository.deleteEmailTemplate(id); },
  async deleteLetterTemplate(id: string) { return usersRepository.deleteLetterTemplate(id); },

  async adminResetPassword(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError(`User ${userId} not found`);
    const tempPassword = `Reset${Date.now().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await usersRepository.update(userId, { passwordHash });
    logger.info({ userId, email: user.email }, 'Admin reset password for user');
    try {
      await smtpService.sendEmail({
        to: user.email,
        subject: 'Your password has been reset - FreightClaims',
        html: `<p>Your password has been reset by an administrator.</p><p>Temporary password: <strong>${tempPassword}</strong></p><p>Please change your password after logging in.</p>`,
      });
    } catch {
      logger.warn({ userId }, 'Failed to send reset email, password was still changed');
    }
    return { message: 'Password reset successfully' };
  },
};
