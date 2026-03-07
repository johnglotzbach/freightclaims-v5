/**
 * AutomationService - Business rule engine and workflow automation
 *
 * Location: apps/api/src/services/automation.service.ts
 */
import { automationRepository } from '../repositories/automation.repository';
import { NotFoundError } from '../utils/errors';
import type { JwtPayload } from '../middleware/auth.middleware';
import { forCorporate } from '../middleware/tenant.middleware';

async function verifyRuleAccess(id: string, user: JwtPayload) {
  const rule = await automationRepository.getRuleById(id);
  if (!rule) throw new NotFoundError(`Automation rule ${id} not found`);
  if (!user.isSuperAdmin && rule.corporateId && rule.corporateId !== user.corporateId) {
    throw new NotFoundError(`Automation rule ${id} not found`);
  }
  return rule;
}

async function verifyTemplateAccess(id: string, user: JwtPayload) {
  const tpl = await automationRepository.getTemplateById(id);
  if (!tpl) throw new NotFoundError(`Automation template ${id} not found`);
  if (!user.isSuperAdmin && tpl.corporateId && tpl.corporateId !== user.corporateId) {
    throw new NotFoundError(`Automation template ${id} not found`);
  }
  return tpl;
}

export const automationService = {
  async listRules(user: JwtPayload) {
    return automationRepository.listRules(forCorporate(user.corporateId, user.isSuperAdmin));
  },

  async getRuleById(id: string, user: JwtPayload) {
    return verifyRuleAccess(id, user);
  },

  async createRule(data: Record<string, unknown>, user: JwtPayload) {
    return automationRepository.createRule({ ...data, corporateId: user.corporateId });
  },

  async updateRule(id: string, data: Record<string, unknown>, user: JwtPayload) {
    await verifyRuleAccess(id, user);
    return automationRepository.updateRule(id, data);
  },

  async deleteRule(id: string, user: JwtPayload) {
    await verifyRuleAccess(id, user);
    return automationRepository.deleteRule(id);
  },

  async listTemplates(user: JwtPayload) {
    return automationRepository.listTemplates(forCorporate(user.corporateId, user.isSuperAdmin));
  },

  async createTemplate(data: Record<string, unknown>, user: JwtPayload) {
    return automationRepository.createTemplate({ ...data, corporateId: user.corporateId });
  },

  async updateTemplate(id: string, data: Record<string, unknown>, user: JwtPayload) {
    await verifyTemplateAccess(id, user);
    return automationRepository.updateTemplate(id, data);
  },

  async deleteTemplate(id: string, user: JwtPayload) {
    await verifyTemplateAccess(id, user);
    return automationRepository.deleteTemplate(id);
  },

  async triggerRule(ruleId: string, user: JwtPayload) {
    const rule = await verifyRuleAccess(ruleId, user);
    if (!rule.isActive) return { ruleId, triggered: false, reason: 'Rule is inactive' };

    const tenantFilter = forCorporate(user.corporateId, user.isSuperAdmin);
    const matched = await automationRepository.findMatchingClaims(ruleId, tenantFilter);
    let actioned = 0;

    for (const claim of matched) {
      await automationRepository.executeRuleActions(ruleId, claim.id);
      actioned++;
    }

    await automationRepository.updateRule(ruleId, { lastTriggeredAt: new Date() });

    return { ruleId, triggered: true, matchedClaims: matched.length, actioned };
  },
};
