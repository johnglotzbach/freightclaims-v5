/**
 * AIService - Public facade for the AI agent system (Google Gemini)
 *
 * Thin layer that the controller calls. Delegates actual work to the
 * supervisor/agent framework in ./agents/. Handles conversation management
 * for the copilot and agent status queries.
 *
 * Location: apps/api/src/services/ai.service.ts
 * Related: apps/api/src/services/agents/ (full agent framework)
 */
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { runAgent, runWorkflow, listAgents } from './agents';
import type { AgentType } from './agents';
import type { JwtPayload } from '../middleware/auth.middleware';

export const aiService = {
  /**
   * Dispatches a request to a specific specialized agent.
   * Called by explicit agent endpoints (POST /agents/intake, etc.)
   */
  async runAgent(agentType: string, input: Record<string, unknown>, user: JwtPayload) {
    logger.info({ agentType, userId: user.userId }, 'Running AI agent');

    if (!env.GEMINI_API_KEY?.trim()) {
      return {
        agentType,
        status: 'failed',
        result: 'AI features require a Gemini API key. Please configure GEMINI_API_KEY in your environment variables.',
        summary: 'Missing API key',
        timestamp: new Date().toISOString(),
      };
    }

    const result = await runAgent(agentType as AgentType, input, user.userId);
    return {
      agentType: result.agentType,
      status: result.status,
      result: result.result,
      structuredOutput: result.structuredOutput,
      summary: result.summary,
      durationMs: result.durationMs,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Copilot chat — routes through the supervisor which picks the copilot agent.
   * Maintains conversation history across messages.
   */
  async chat(input: { message: string; conversationId?: string }, user: JwtPayload) {
    logger.info({ userId: user.userId, conversationId: input.conversationId }, 'AI copilot chat');

    if (!env.GEMINI_API_KEY?.trim()) {
      return {
        response: 'AI features require a Gemini API key. Please configure GEMINI_API_KEY in your environment variables to enable the AI Copilot.',
        conversationId: input.conversationId,
      };
    }

    const { result } = await runWorkflow(
      { message: input.message },
      user.userId,
      {
        agentType: 'copilot',
        conversationId: input.conversationId,
      },
    );

    if (result.status === 'failed') {
      const detail = typeof result.result === 'string' ? result.result : '';
      logger.error({ detail, userId: user.userId }, 'AI copilot chat failed');
      return {
        response: `AI error: ${detail || 'Unknown failure. Check server logs for details.'}`,
        conversationId: input.conversationId,
      };
    }

    return {
      response: result.result as string,
      conversationId: (result.structuredOutput as any)?.conversationId || input.conversationId,
    };
  },

  async getConversations(userId: string) {
    return prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  },

  async getConversation(id: string) {
    return prisma.aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  },

  async deleteConversation(id: string) {
    await prisma.aiConversation.delete({ where: { id } });
  },

  async getAgentStatus() {
    const [recentRuns, agents] = await Promise.all([
      prisma.aiAgentRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { agentType: true, status: true, createdAt: true, duration: true },
      }),
      Promise.resolve(listAgents()),
    ]);

    return {
      agents,
      recentRuns,
      status: 'operational',
      model: env.AI_MODEL,
      provider: 'gemini',
    };
  },

  async getAgentHistory(query: Record<string, unknown>) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 25, 100);

    const [data, total] = await Promise.all([
      prisma.aiAgentRun.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aiAgentRun.count(),
    ]);

    return { data, total, page, limit };
  },
};
