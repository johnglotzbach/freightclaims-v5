/**
 * Supervisor Agent - Orchestrates specialized sub-agents
 *
 * The supervisor is the central coordinator of the AI system. When a request
 * comes in, it decides which specialized agent(s) to invoke, manages the
 * workflow state across multi-step operations, and aggregates results.
 *
 * Architecture:
 *   Request → Supervisor → [Route to Agent] → Agent runs → Result
 *                       → [Optional chain]  → Next Agent → ...
 *                       → Final aggregated result
 *
 * Location: apps/api/src/services/agents/supervisor.ts
 */
import { v4 as uuid } from 'uuid';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { generateJSON } from './gemini-client';
import { agentRegistry } from './registry';
import type {
  AgentContext,
  AgentResult,
  AgentType,
  RoutingDecision,
  WorkflowState,
  WorkflowStep,
} from './types';

const MAX_CHAIN_DEPTH = 5;

/**
 * Uses Gemini to decide which specialized agent should handle a request.
 * Falls back to the explicitly requested agent if routing fails.
 */
async function routeRequest(
  userMessage: string,
  requestedAgent?: AgentType,
): Promise<RoutingDecision> {
  if (requestedAgent) {
    return { selectedAgent: requestedAgent, reasoning: 'Explicitly requested', confidence: 1.0 };
  }

  try {
    const agents = Array.from(agentRegistry.entries())
      .map(([type, agent]) => `- ${type}: ${agent.description}`)
      .join('\n');

    const decision = await generateJSON<RoutingDecision>(
      `Given this user request, decide which specialized freight claims agent should handle it.

Available agents:
${agents}

User request: "${userMessage}"

Return JSON with: selectedAgent (one of the agent types), reasoning (why this agent), confidence (0-1).`,
      { systemInstruction: 'You are a freight claims AI router. Pick the best agent for the task.' },
    );

    logger.info({ decision }, 'Supervisor routed request');
    return decision;
  } catch (err) {
    logger.warn({ err }, 'Routing failed, defaulting to copilot');
    return { selectedAgent: 'copilot', reasoning: 'Routing error fallback', confidence: 0.5 };
  }
}

/**
 * Runs a single agent and records the result. If the agent returns a `nextAgent`
 * field, the supervisor chains to that agent automatically (up to MAX_CHAIN_DEPTH).
 */
async function executeAgent(
  agentType: AgentType,
  ctx: AgentContext,
  workflow: WorkflowState,
): Promise<AgentResult> {
  const agent = agentRegistry.get(agentType);
  if (!agent) {
    return {
      agentType,
      status: 'failed',
      result: `Unknown agent type: ${agentType}`,
      summary: 'Agent not found',
    };
  }

  const step: WorkflowStep = {
    stepNumber: workflow.steps.length + 1,
    agentType,
    status: 'running',
    startedAt: new Date(),
  };
  workflow.steps.push(step);

  const start = Date.now();

  try {
    const result = await agent.run(ctx);
    step.status = result.status;
    step.result = result;
    step.completedAt = new Date();
    result.durationMs = Date.now() - start;

    // Persist the run for monitoring
    await prisma.aiAgentRun.create({
      data: {
        agentType,
        input: ctx.input as any,
        output: { result: result.result, summary: result.summary } as any,
        status: result.status,
        duration: result.durationMs,
        userId: ctx.userId,
      },
    }).catch((err) => logger.warn({ err }, 'Failed to persist agent run'));

    // Merge any structured output into workflow memory for downstream agents
    if (result.structuredOutput) {
      Object.assign(ctx.memory, { [`${agentType}_output`]: result.structuredOutput });
    }

    // Chain to next agent if requested and within depth limit
    if (result.nextAgent && workflow.steps.length < MAX_CHAIN_DEPTH) {
      logger.info(
        { from: agentType, to: result.nextAgent, step: workflow.steps.length },
        'Chaining to next agent',
      );
      return executeAgent(result.nextAgent, ctx, workflow);
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;
    step.status = 'failed';
    step.completedAt = new Date();
    logger.error({ err, agentType, duration }, 'Agent execution failed');

    return {
      agentType,
      status: 'failed',
      result: 'Agent encountered an internal error',
      durationMs: duration,
      summary: `${agent.name} failed after ${duration}ms`,
    };
  }
}

/**
 * Main entry point: run a workflow for a given request.
 *
 * If `agentType` is specified, routes directly to that agent.
 * Otherwise, uses Gemini to pick the best agent based on the input.
 */
export async function runWorkflow(
  input: Record<string, unknown>,
  userId: string,
  options: { agentType?: AgentType; claimId?: string; conversationId?: string } = {},
): Promise<{ workflow: WorkflowState; result: AgentResult }> {
  const workflow: WorkflowState = {
    id: uuid(),
    userId,
    claimId: options.claimId,
    steps: [],
    memory: {},
    status: 'running',
    startedAt: new Date(),
  };

  const ctx: AgentContext = {
    userId,
    claimId: options.claimId,
    conversationId: options.conversationId,
    input,
    memory: workflow.memory,
  };

  // Decide which agent to use
  const routing = await routeRequest(
    (input.message as string) || JSON.stringify(input),
    options.agentType,
  );

  logger.info(
    { workflowId: workflow.id, agent: routing.selectedAgent, confidence: routing.confidence },
    'Starting workflow',
  );

  const result = await executeAgent(routing.selectedAgent, ctx, workflow);

  workflow.status = result.status;
  workflow.completedAt = new Date();

  return { workflow, result };
}

/**
 * Run a specific agent by type (used by the controller for explicit endpoints
 * like POST /agents/intake).
 */
export async function runAgent(
  agentType: AgentType,
  input: Record<string, unknown>,
  userId: string,
): Promise<AgentResult> {
  const { result } = await runWorkflow(input, userId, {
    agentType,
    claimId: input.claimId as string | undefined,
  });
  return result;
}
