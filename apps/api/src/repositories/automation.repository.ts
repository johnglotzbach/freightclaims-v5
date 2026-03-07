/**
 * AutomationRepository - Database queries for automation rules, templates, and execution
 *
 * Location: apps/api/src/repositories/automation.repository.ts
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const automationRepository = {
  async listRules(tenantFilter: Record<string, unknown> = {}) {
    return prisma.automationRule.findMany({ where: tenantFilter as any, orderBy: { createdAt: 'desc' } });
  },

  async getRuleById(id: string) {
    return prisma.automationRule.findUnique({ where: { id } });
  },

  async createRule(data: Record<string, unknown>) {
    return prisma.automationRule.create({ data: data as any });
  },

  async updateRule(id: string, data: Record<string, unknown>) {
    return prisma.automationRule.update({ where: { id }, data: data as any });
  },

  async deleteRule(id: string) {
    return prisma.automationRule.delete({ where: { id } });
  },

  async listTemplates(tenantFilter: Record<string, unknown> = {}) {
    return prisma.automationTemplate.findMany({ where: tenantFilter as any, orderBy: { name: 'asc' } });
  },

  async getTemplateById(id: string) {
    return prisma.automationTemplate.findUnique({ where: { id } });
  },

  async createTemplate(data: Record<string, unknown>) {
    return prisma.automationTemplate.create({ data: data as any });
  },

  async updateTemplate(id: string, data: Record<string, unknown>) {
    return prisma.automationTemplate.update({ where: { id }, data: data as any });
  },

  async deleteTemplate(id: string) {
    return prisma.automationTemplate.delete({ where: { id } });
  },

  /**
   * Finds claims that match the conditions defined in an automation rule.
   * Parses the rule's JSON conditions and builds a Prisma query.
   * Applies tenant isolation via tenantFilter on the claim's corporateId.
   */
  async findMatchingClaims(ruleId: string, tenantFilter: Record<string, unknown> = {}) {
    const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) return [];

    const conditions = rule.conditions as Record<string, unknown>;
    const where: Record<string, unknown> = { deletedAt: null, ...tenantFilter };

    if (conditions.status) where.status = conditions.status;
    if (conditions.claimType) where.claimType = conditions.claimType;
    if (conditions.minAmount) {
      where.claimAmount = { gte: Number(conditions.minAmount) };
    }
    if (conditions.olderThanDays) {
      where.updatedAt = {
        lte: new Date(Date.now() - Number(conditions.olderThanDays) * 86400_000),
      };
    }

    const claims = await prisma.claim.findMany({
      where: where as any,
      select: { id: true, claimNumber: true, status: true },
      take: 100,
    });

    logger.info({ ruleId, matched: claims.length }, 'Automation rule match scan');
    return claims;
  },

  /**
   * Executes the actions defined in a rule for a specific claim.
   * Creates timeline entries and notifications as side effects.
   */
  async executeRuleActions(ruleId: string, claimId: string) {
    const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) return;

    const actions = rule.actions as Record<string, unknown>;

    if (actions.setStatus) {
      await prisma.claim.update({
        where: { id: claimId },
        data: { status: actions.setStatus as string },
      });
      await prisma.claimTimeline.create({
        data: {
          claimId,
          status: actions.setStatus as string,
          description: `Auto-updated by rule: ${rule.name}`,
          changedById: 'system',
        },
      });
    }

    if (actions.notify && actions.notifyUserId) {
      await prisma.notification.create({
        data: {
          userId: actions.notifyUserId as string,
          title: `Automation: ${rule.name}`,
          message: (actions.notifyMessage as string) || `Rule "${rule.name}" triggered on claim ${claimId}`,
          type: 'info',
          link: `/claims/${claimId}`,
        },
      });
    }

    logger.info({ ruleId, claimId }, 'Automation rule actions executed');
  },
};
