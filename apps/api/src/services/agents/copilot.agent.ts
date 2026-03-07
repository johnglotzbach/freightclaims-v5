/**
 * Customer Copilot Agent - Conversational AI for claim inquiries
 *
 * The user-facing chatbot. Answers questions like "What's happening with
 * claim 84721?" using internal claim state, documents, and compliance data.
 * Can also trigger other agents when the user's question requires analysis.
 *
 * Location: apps/api/src/services/agents/copilot.agent.ts
 */
import { chat, type GeminiMessage } from './gemini-client';
import { prisma } from '../../config/database';
import type { BaseAgent, AgentContext, AgentResult } from './types';

const SYSTEM_PROMPT = `You are the FreightClaims AI Copilot — a knowledgeable assistant for freight claim professionals working within the FreightClaims.com platform.

You have deep expertise in:
- The Carmack Amendment (carrier liability, all timeline requirements)
- Freight claim types: damage, shortage, loss, concealed damage, refused, theft
- Claim lifecycle: intake → documentation → filing → negotiation → settlement → close
- Carrier behavior patterns, denial tactics, and effective rebuttal strategies
- Required documents: BOL, POD, invoice, damage photos, inspection reports
- Industry terminology: SCAC codes, PRO numbers, NMFC codes, freight classes

Guidelines:
- Answer concisely and accurately based on available claim data
- Reference specific Carmack timelines and deadlines when relevant
- If the user asks about a specific claim, pull its data before answering
- Don't make up claim numbers or data that wasn't provided
- Suggest when the user should escalate or use a specialized agent
- Be professional but conversational — you're a helpful colleague, not a robot`;

export const copilotAgent: BaseAgent = {
  type: 'copilot',
  name: 'Customer Copilot Agent',
  description: 'Conversational AI that answers questions about claims, compliance, documents, and freight industry topics.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const userMessage = (ctx.input.message as string) || '';
    const conversationId = ctx.conversationId;

    // Load conversation history if we have one
    const history: GeminiMessage[] = [];

    if (conversationId) {
      const existing = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });

      if (existing) {
        for (const msg of existing.messages) {
          history.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    // Enrich context if a claim ID is mentioned or in scope
    let claimContext = '';
    const claimIdMatch = userMessage.match(/claim\s*#?\s*(\w{8}-\w{4}|\d{6,}|FC-\d+)/i);
    const claimId = ctx.claimId || (claimIdMatch ? claimIdMatch[1] : null);

    if (claimId) {
      const claim = await prisma.claim.findFirst({
        where: {
          OR: [
            { id: claimId },
            { claimNumber: { contains: claimId, mode: 'insensitive' } },
          ],
        },
        include: {
          customer: { select: { name: true } },
          parties: true,
          documents: { select: { documentName: true, createdAt: true } },
          timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
          tasks: { where: { status: { in: ['pending', 'in_progress'] } } },
          payments: true,
        },
      });

      if (claim) {
        claimContext = `\n\nCLAIM DATA (pulled from system):\n${JSON.stringify({
          claimNumber: claim.claimNumber,
          proNumber: claim.proNumber,
          status: claim.status,
          type: claim.claimType,
          amount: Number(claim.claimAmount),
          settled: claim.settledAmount ? Number(claim.settledAmount) : null,
          customer: claim.customer?.name,
          parties: claim.parties.map((p) => ({ type: p.type, name: p.name })),
          documents: claim.documents.map((d) => d.documentName),
          recentTimeline: claim.timeline.map((t) => ({ date: t.createdAt, status: t.status, note: t.description })),
          pendingTasks: claim.tasks.map((t) => ({ title: t.title, priority: t.priority })),
          payments: claim.payments.map((p) => ({ amount: Number(p.amount), type: p.type })),
          filed: claim.filingDate,
          delivered: claim.deliveryDate,
        }, null, 2)}`;
      }
    }

    // Add the current message to history
    history.push({
      role: 'user',
      parts: [{ text: userMessage + claimContext }],
    });

    const response = await chat(history, { systemInstruction: SYSTEM_PROMPT });

    // Save conversation
    let savedConversationId = conversationId;
    if (!savedConversationId) {
      const conv = await prisma.aiConversation.create({
        data: { userId: ctx.userId, title: userMessage.slice(0, 100) },
      });
      savedConversationId = conv.id;
    }

    await prisma.aiMessage.createMany({
      data: [
        { conversationId: savedConversationId, role: 'user', content: userMessage },
        { conversationId: savedConversationId, role: 'assistant', content: response },
      ],
    });

    return {
      agentType: 'copilot',
      status: 'completed',
      result: response,
      structuredOutput: { conversationId: savedConversationId },
      durationMs: Date.now() - start,
      summary: 'Copilot response generated',
    };
  },
};
