/**
 * Agent Registry - Maps agent types to their implementations
 *
 * Central place where all specialized agents are registered.
 * The supervisor imports this to dispatch work to the right agent.
 */
import type { AgentType, BaseAgent } from './types';
import { intakeAgent } from './intake.agent';
import { documentsAgent } from './documents.agent';
import { complianceAgent } from './compliance.agent';
import { negotiationAgent } from './negotiation.agent';
import { valuationAgent } from './valuation.agent';
import { followupAgent } from './followup.agent';
import { copilotAgent } from './copilot.agent';
import { predictorAgent } from './predictor.agent';
import { riskAgent } from './risk.agent';
import { fraudAgent } from './fraud.agent';
import { denialAgent } from './denial.agent';
import { communicationAgent } from './communication.agent';
import { rootcauseAgent } from './rootcause.agent';

export const agentRegistry: Map<AgentType, BaseAgent> = new Map([
  ['intake', intakeAgent],
  ['documents', documentsAgent],
  ['compliance', complianceAgent],
  ['negotiation', negotiationAgent],
  ['valuation', valuationAgent],
  ['followup', followupAgent],
  ['copilot', copilotAgent],
  ['predictor', predictorAgent],
  ['risk', riskAgent],
  ['fraud', fraudAgent],
  ['denial', denialAgent],
  ['communication', communicationAgent],
  ['rootcause', rootcauseAgent],
]);

/** List all registered agents with their metadata */
export function listAgents(): Array<{ type: AgentType; name: string; description: string }> {
  return Array.from(agentRegistry.entries()).map(([type, agent]) => ({
    type,
    name: agent.name,
    description: agent.description,
  }));
}
