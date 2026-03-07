/**
 * AutomationService - Business rule engine and workflow automation
 *
 * Location: apps/api/src/services/automation.service.ts
 */
import { automationRepository } from '../repositories/automation.repository';

export const automationService = {
  async listRules() { return automationRepository.listRules(); },
  async getRuleById(id: string) { return automationRepository.getRuleById(id); },
  async createRule(data: Record<string, unknown>) { return automationRepository.createRule(data); },
  async updateRule(id: string, data: Record<string, unknown>) { return automationRepository.updateRule(id, data); },
  async deleteRule(id: string) { return automationRepository.deleteRule(id); },
  async listTemplates() { return automationRepository.listTemplates(); },
  async createTemplate(data: Record<string, unknown>) { return automationRepository.createTemplate(data); },
  async updateTemplate(id: string, data: Record<string, unknown>) { return automationRepository.updateTemplate(id, data); },
  async deleteTemplate(id: string) { return automationRepository.deleteTemplate(id); },
  /** Evaluates and executes an automation rule against matching claims */
  async triggerRule(ruleId: string) {
    const rule = await automationRepository.getRuleById(ruleId);
    if (!rule) throw new Error(`Automation rule ${ruleId} not found`);
    if (!rule.isActive) return { ruleId, triggered: false, reason: 'Rule is inactive' };

    const matched = await automationRepository.findMatchingClaims(ruleId);
    let actioned = 0;

    for (const claim of matched) {
      await automationRepository.executeRuleActions(ruleId, claim.id);
      actioned++;
    }

    await automationRepository.updateRule(ruleId, { lastTriggeredAt: new Date() });

    return { ruleId, triggered: true, matchedClaims: matched.length, actioned };
  },
};
