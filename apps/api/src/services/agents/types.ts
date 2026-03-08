/**
 * Agent Type Definitions - Shared types for the AI agent framework
 *
 * Defines the contracts between the supervisor, specialized agents,
 * and the tool system. Every agent implements BaseAgent, and every
 * tool call follows the AgentTool interface.
 *
 * Location: apps/api/src/services/agents/types.ts
 */

/** Supported agent identifiers. Maps 1:1 to specialized agent modules. */
export type AgentType =
  | 'intake'
  | 'documents'
  | 'compliance'
  | 'negotiation'
  | 'valuation'
  | 'followup'
  | 'copilot'
  | 'predictor'
  | 'risk'
  | 'fraud'
  | 'denial'
  | 'communication'
  | 'rootcause';

/** Status of an agent run */
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timeout';

/** Context passed to every agent invocation */
export interface AgentContext {
  userId: string;
  claimId?: string;
  customerId?: string;
  conversationId?: string;
  corporateId?: string | null;
  isSuperAdmin?: boolean;
  /** Raw input from the API request */
  input: Record<string, unknown>;
  /** Accumulated memory across steps in a multi-step workflow */
  memory: Record<string, unknown>;
}

/** Result returned by any specialized agent */
export interface AgentResult {
  agentType: AgentType;
  status: AgentRunStatus;
  result: unknown;
  /** Structured data the agent extracted or produced */
  structuredOutput?: Record<string, unknown>;
  /** Tokens consumed by this run */
  tokenUsage?: { prompt: number; completion: number; total: number };
  /** Wall-clock duration in ms */
  durationMs?: number;
  /** If the agent wants the supervisor to hand off to another agent next */
  nextAgent?: AgentType;
  /** Human-readable summary of what was done */
  summary?: string;
}

/** A tool that agents can invoke to interact with the system */
export interface AgentTool {
  name: string;
  description: string;
  execute: (params: Record<string, unknown>, ctx: AgentContext) => Promise<unknown>;
}

/**
 * Every specialized agent implements this interface.
 * The supervisor calls `run()` and reads the result.
 */
export interface BaseAgent {
  type: AgentType;
  name: string;
  description: string;
  run: (ctx: AgentContext) => Promise<AgentResult>;
}

/** Supervisor routing decision from Gemini */
export interface RoutingDecision {
  selectedAgent: AgentType;
  reasoning: string;
  confidence: number;
}

/** Workflow step tracked by the supervisor */
export interface WorkflowStep {
  stepNumber: number;
  agentType: AgentType;
  status: AgentRunStatus;
  result?: AgentResult;
  startedAt: Date;
  completedAt?: Date;
}

/** Full workflow state managed by the supervisor */
export interface WorkflowState {
  id: string;
  userId: string;
  claimId?: string;
  steps: WorkflowStep[];
  memory: Record<string, unknown>;
  status: AgentRunStatus;
  startedAt: Date;
  completedAt?: Date;
}
