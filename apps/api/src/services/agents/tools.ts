/**
 * Agent Tool Registry - Tools available to specialized agents
 *
 * Each tool wraps a system operation (DB query, S3 fetch, email send, etc.)
 * in a format agents can invoke. The supervisor passes the tool registry
 * to each agent, and agents reference tools by name in their prompts.
 *
 * Location: apps/api/src/services/agents/tools.ts
 */
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import type { AgentTool, AgentContext } from './types';

/** Fetch a claim and all related data by ID */
const getClaimTool: AgentTool = {
  name: 'getClaim',
  description: 'Retrieves a claim with all related parties, products, documents, timeline, and payments',
  async execute(params, _ctx) {
    const id = params.claimId as string;
    return prisma.claim.findUnique({
      where: { id },
      include: {
        customer: true,
        parties: true,
        products: true,
        documents: { include: { category: true } },
        timeline: { orderBy: { createdAt: 'desc' } },
        payments: true,
        comments: { orderBy: { createdAt: 'desc' }, take: 10 },
        tasks: { where: { status: { not: 'cancelled' } } },
      },
    });
  },
};

/** Search claims by various filters */
const searchClaimsTool: AgentTool = {
  name: 'searchClaims',
  description: 'Search claims by status, customer, carrier SCAC, date range, or claim type',
  async execute(params, _ctx) {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.customerId) where.customerId = params.customerId;
    if (params.claimType) where.claimType = params.claimType;
    if (params.proNumber) where.proNumber = { contains: params.proNumber as string, mode: 'insensitive' };

    return prisma.claim.findMany({
      where: where as any,
      include: { customer: true, parties: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(params.limit) || 25, 100),
    });
  },
};

/** List documents attached to a claim */
const getClaimDocumentsTool: AgentTool = {
  name: 'getClaimDocuments',
  description: 'Lists all documents for a claim, including category and upload info',
  async execute(params) {
    return prisma.claimDocument.findMany({
      where: { claimId: params.claimId as string },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};

/** Get required documents for a claim type and check which are missing */
const checkMissingDocumentsTool: AgentTool = {
  name: 'checkMissingDocuments',
  description: 'Compares uploaded documents against required categories for this claim type',
  async execute(params) {
    const claimId = params.claimId as string;
    const claimType = params.claimType as string;

    const [uploaded, required] = await Promise.all([
      prisma.claimDocument.findMany({
        where: { claimId },
        include: { category: true },
      }),
      prisma.documentCategoryMapping.findMany({
        where: { claimType, isRequired: true },
        include: { category: true },
      }),
    ]);

    const uploadedCategories = new Set(uploaded.map((d: any) => d.category?.name).filter(Boolean));
    const missing = required
      .filter((r: any) => !uploadedCategories.has(r.category.name))
      .map((r: any) => r.category.name);

    return { uploaded: uploaded.length, required: required.length, missing };
  },
};

/** Get carrier information by SCAC code */
const getCarrierTool: AgentTool = {
  name: 'getCarrier',
  description: 'Looks up carrier details and contacts by SCAC code',
  async execute(params) {
    const scac = (params.scacCode as string)?.toUpperCase();
    return prisma.carrier.findUnique({
      where: { scacCode: scac },
      include: { contacts: true, integrations: { select: { type: true, portalUrl: true, isActive: true } } },
    });
  },
};

/** Create a timeline entry for a claim */
const addTimelineEntryTool: AgentTool = {
  name: 'addTimelineEntry',
  description: 'Adds a status/event entry to the claim timeline',
  async execute(params, ctx) {
    return prisma.claimTimeline.create({
      data: {
        claimId: params.claimId as string,
        status: params.status as string,
        description: params.description as string,
        changedById: ctx.userId,
      },
    });
  },
};

/** Create a task on a claim */
const createTaskTool: AgentTool = {
  name: 'createTask',
  description: 'Creates a follow-up task on a claim (e.g., "Request missing BOL")',
  async execute(params, ctx) {
    return prisma.claimTask.create({
      data: {
        claimId: params.claimId as string,
        title: params.title as string,
        description: params.description as string | undefined,
        priority: (params.priority as string) || 'medium',
        dueDate: params.dueDate ? new Date(params.dueDate as string) : undefined,
        createdById: ctx.userId,
      },
    });
  },
};

/** Add a comment to a claim */
const addCommentTool: AgentTool = {
  name: 'addComment',
  description: 'Adds an internal comment or note to a claim',
  async execute(params, ctx) {
    return prisma.claimComment.create({
      data: {
        claimId: params.claimId as string,
        userId: ctx.userId,
        content: params.content as string,
        type: (params.type as string) || 'system',
      },
    });
  },
};

/** Update claim status */
const updateClaimStatusTool: AgentTool = {
  name: 'updateClaimStatus',
  description: 'Updates the status of a claim and logs it in the timeline',
  async execute(params, ctx) {
    const claimId = params.claimId as string;
    const newStatus = params.status as string;

    const [claim] = await Promise.all([
      prisma.claim.update({ where: { id: claimId }, data: { status: newStatus } }),
      prisma.claimTimeline.create({
        data: {
          claimId,
          status: newStatus,
          description: params.reason as string | undefined,
          changedById: ctx.userId,
        },
      }),
    ]);

    return claim;
  },
};

/** Get historical claim data for valuation analysis */
const getClaimHistoryTool: AgentTool = {
  name: 'getClaimHistory',
  description: 'Gets historical settlement data for similar claims (by carrier, type, commodity)',
  async execute(params) {
    const where: Record<string, unknown> = {
      status: { in: ['settled', 'closed'] },
      settledAmount: { not: null },
    };
    if (params.claimType) where.claimType = params.claimType;

    const claims = await prisma.claim.findMany({
      where: where as any,
      select: {
        claimType: true,
        claimAmount: true,
        settledAmount: true,
        status: true,
        filingDate: true,
        parties: { where: { type: 'carrier' }, select: { scacCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const amounts = claims
      .filter((c: any) => c.settledAmount)
      .map((c: any) => ({
        claimed: Number(c.claimAmount),
        settled: Number(c.settledAmount),
        ratio: Number(c.settledAmount) / Number(c.claimAmount),
        carrier: c.parties[0]?.scacCode || 'unknown',
      }));

    const avgRatio = amounts.length > 0
      ? amounts.reduce((sum: any, a: any) => sum + a.ratio, 0) / amounts.length
      : 0;

    return { sampleSize: amounts.length, averageSettlementRatio: avgRatio, data: amounts };
  },
};

/**
 * Master registry of all available tools.
 * Agents pick from this list based on their specialization.
 */
export const toolRegistry: Map<string, AgentTool> = new Map([
  ['getClaim', getClaimTool],
  ['searchClaims', searchClaimsTool],
  ['getClaimDocuments', getClaimDocumentsTool],
  ['checkMissingDocuments', checkMissingDocumentsTool],
  ['getCarrier', getCarrierTool],
  ['addTimelineEntry', addTimelineEntryTool],
  ['createTask', createTaskTool],
  ['addComment', addCommentTool],
  ['updateClaimStatus', updateClaimStatusTool],
  ['getClaimHistory', getClaimHistoryTool],
]);

/** Returns tools filtered to the given names */
export function getToolsForAgent(names: string[]): AgentTool[] {
  return names.map((n) => toolRegistry.get(n)).filter(Boolean) as AgentTool[];
}

/** Executes a named tool with params, returning the result or an error message */
export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  ctx: AgentContext,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const tool = toolRegistry.get(toolName);
  if (!tool) return { success: false, error: `Unknown tool: ${toolName}` };

  try {
    const data = await tool.execute(params, ctx);
    logger.debug({ toolName, params }, 'Tool executed');
    return { success: true, data };
  } catch (err) {
    logger.error({ err, toolName }, 'Tool execution failed');
    return { success: false, error: String(err) };
  }
}
