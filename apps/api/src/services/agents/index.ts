/**
 * AI Agent System - Public API
 *
 * Re-exports the supervisor entry points and registry so the rest of the
 * API layer only needs to import from this index.
 *
 * Location: apps/api/src/services/agents/index.ts
 */
export { runWorkflow, runAgent } from './supervisor';
export { agentRegistry, listAgents } from './registry';
export { toolRegistry, getToolsForAgent, executeTool } from './tools';
export { generateContent, generateJSON, chat } from './gemini-client';
export type {
  AgentType,
  AgentContext,
  AgentResult,
  BaseAgent,
  WorkflowState,
  AgentTool,
} from './types';
