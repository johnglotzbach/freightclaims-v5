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

const BASE_SYSTEM_PROMPT = `You are the FreightClaims AI Copilot — a knowledgeable assistant for freight claim professionals working within the FreightClaims.com platform (v5.0).

You have deep expertise in:
- The Carmack Amendment (carrier liability, all timeline requirements)
- Freight claim types: damage, shortage, loss, concealed damage, refused, theft
- Claim lifecycle: intake → documentation → filing → negotiation → settlement → close
- Carrier behavior patterns, denial tactics, and effective rebuttal strategies
- Required documents: BOL, POD, invoice, damage photos, inspection reports
- Industry terminology: SCAC codes, PRO numbers, NMFC codes, freight classes

PLATFORM KNOWLEDGE (FreightClaims.com features):
- Dashboard: overview of metrics and compliance alerts at /claims
- Claims List: view all claims at /claims/list. Create new claims with "+ New Claim" button
- To DELETE a claim: open the claim detail page, click the three-dot menu or actions dropdown, select "Delete Claim". Only admins/managers can delete claims.
- AI Entry: create claims from documents/emails at /ai-entry
- Companies: manage customers, carriers, suppliers at /companies
- Shipments: track shipments at /shipments
- Documents: view/upload documents at /documents
- Contracts: manage carrier contracts at /contracts
- Reports: generate reports and export data at /reports/export
- AI Tools: outcome prediction (/ai/predict), risk scoring (/ai/risk), fraud detection (/ai/fraud), denial response (/ai/denial), carrier comms (/ai/communication), root cause analysis (/ai/rootcause)
- Settings: profile, notifications, email config, security, appearance at /settings
- User Management: admin users can manage users at /settings/users
- Roles: configure roles and permissions at /settings/roles
- Administration: admin-only sidebar section with User Management and Roles & Permissions

Guidelines:
- ALWAYS listen to what the user is actually asking. If they ask "how do I delete a claim", answer about DELETING, not filing.
- Answer concisely and accurately based on available claim data and the USER'S DATA SNAPSHOT below
- When users ask about their claims, carriers, users, stats — use the live data snapshot provided
- When users ask about platform features, give specific navigation instructions
- Reference specific Carmack timelines and deadlines when relevant
- If the user asks about a specific claim, use the data from the snapshot or pull it
- Don't make up claim numbers or data that wasn't provided
- You can see the user's actual data: claims, carriers, shipments, documents, users, etc.
- If the user is a Super Admin, you have access to ALL data across all corporate accounts
- If the user is a regular user, you only see their corporate account's data
- Suggest when the user should escalate or use a specialized agent
- Be professional but conversational — you're a helpful colleague, not a robot`;

async function loadUserDataSnapshot(ctx: AgentContext): Promise<string> {
  const corpFilter = ctx.isSuperAdmin ? {} : ctx.corporateId ? { corporateId: ctx.corporateId } : { createdById: ctx.userId };
  const customerFilter = ctx.isSuperAdmin ? {} : ctx.corporateId ? { OR: [{ id: ctx.corporateId }, { corporateId: ctx.corporateId }] } : {};
  const shipmentFilter = ctx.isSuperAdmin ? {} : ctx.corporateId ? { corporateId: ctx.corporateId } : {};

  const [
    user,
    claimStats,
    recentClaims,
    carriers,
    customers,
    shipments,
    pendingTasks,
    recentDocs,
    corporateAccount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true, lastName: true, email: true, role: true, isSuperAdmin: true, corporate: { select: { name: true } } },
    }),
    prisma.claim.groupBy({
      by: ['status'],
      where: corpFilter as any,
      _count: true,
      _sum: { claimAmount: true },
    }),
    prisma.claim.findMany({
      where: corpFilter as any,
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true, claimNumber: true, status: true, claimType: true,
        claimAmount: true, settledAmount: true, proNumber: true,
        createdAt: true, filingDate: true, deliveryDate: true,
        customer: { select: { name: true } },
        parties: { where: { type: 'carrier' }, select: { name: true, scacCode: true } },
      },
    }),
    prisma.carrier.findMany({
      take: 25,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, scacCode: true, dotNumber: true, mcNumber: true },
    }),
    prisma.customer.findMany({
      where: customerFilter as any,
      take: 25,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
    prisma.shipment.findMany({
      where: shipmentFilter as any,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, proNumber: true, bolNumber: true,
        originCity: true, originState: true, destinationCity: true, destinationState: true,
        shipDate: true, deliveryDate: true, createdAt: true,
      },
    }),
    prisma.claimTask.findMany({
      where: { status: { in: ['pending', 'in_progress'] }, claim: corpFilter as any },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: { title: true, priority: true, dueDate: true, status: true, claim: { select: { claimNumber: true } } },
    }),
    prisma.claimDocument.findMany({
      where: { claim: corpFilter as any },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { documentName: true, mimeType: true, createdAt: true, claim: { select: { claimNumber: true } } },
    }),
    ctx.corporateId ? prisma.customer.findUnique({
      where: { id: ctx.corporateId },
      select: { name: true, industry: true, isCorporate: true },
    }) : null,
  ]);

  const totalClaims = claimStats.reduce((s: number, g: any) => s + g._count, 0);
  const totalValue = claimStats.reduce((s: number, g: any) => s + Number(g._sum?.claimAmount || 0), 0);
  const statusBreakdown = claimStats.map((g: any) => `${g.status}: ${g._count}`).join(', ');

  let snapshot = `\n\n--- USER'S LIVE DATA SNAPSHOT ---\n`;
  snapshot += `User: ${user?.firstName} ${user?.lastName} (${user?.email})\n`;
  snapshot += `Role: ${user?.role}${ctx.isSuperAdmin ? ' (SUPER ADMIN — full platform access)' : ''}\n`;
  if (corporateAccount) snapshot += `Corporate Account: ${corporateAccount.name}${corporateAccount.industry ? ` (${corporateAccount.industry})` : ''}\n`;
  if (ctx.isSuperAdmin) snapshot += `Access Level: ALL corporate accounts and data\n`;

  snapshot += `\nCLAIM STATISTICS:\n`;
  snapshot += `Total claims: ${totalClaims} | Total value: $${totalValue.toLocaleString()}\n`;
  snapshot += `By status: ${statusBreakdown || 'No claims yet'}\n`;

  if (recentClaims.length > 0) {
    snapshot += `\nRECENT CLAIMS (newest first):\n`;
    for (const c of recentClaims) {
      const carrier = (c as any).parties?.[0];
      snapshot += `- ${c.claimNumber} | ${c.status} | ${c.claimType} | $${Number(c.claimAmount).toLocaleString()} | PRO: ${c.proNumber || 'N/A'} | Carrier: ${carrier?.name || 'N/A'} | Customer: ${(c as any).customer?.name || 'N/A'} | Created: ${c.createdAt.toISOString().split('T')[0]}\n`;
    }
  }

  if (carriers.length > 0) {
    snapshot += `\nCARRIERS IN SYSTEM (${carriers.length}):\n`;
    for (const ca of carriers) {
      snapshot += `- ${ca.name} (SCAC: ${ca.scacCode || 'N/A'}, DOT: ${ca.dotNumber || 'N/A'}, MC: ${ca.mcNumber || 'N/A'})\n`;
    }
  }

  if (customers.length > 0) {
    snapshot += `\nCUSTOMERS (${customers.length}):\n`;
    for (const cu of customers) {
      snapshot += `- ${cu.name} (${cu.email || 'no email'})\n`;
    }
  }

  if (shipments.length > 0) {
    snapshot += `\nRECENT SHIPMENTS:\n`;
    for (const s of shipments) {
      const origin = [s.originCity, s.originState].filter(Boolean).join(', ') || '?';
      const dest = [s.destinationCity, s.destinationState].filter(Boolean).join(', ') || '?';
      snapshot += `- PRO: ${s.proNumber} | ${origin} → ${dest} | Ship: ${s.shipDate?.toISOString().split('T')[0] || 'N/A'}\n`;
    }
  }

  if (pendingTasks.length > 0) {
    snapshot += `\nPENDING TASKS:\n`;
    for (const t of pendingTasks) {
      snapshot += `- [${t.priority}] ${t.title} (Claim: ${(t as any).claim?.claimNumber || 'N/A'}) — Due: ${t.dueDate?.toISOString().split('T')[0] || 'no date'}\n`;
    }
  }

  if (recentDocs.length > 0) {
    snapshot += `\nRECENT DOCUMENTS:\n`;
    for (const d of recentDocs) {
      snapshot += `- ${d.documentName} (${d.mimeType}) — Claim: ${(d as any).claim?.claimNumber || 'N/A'}\n`;
    }
  }

  snapshot += `--- END DATA SNAPSHOT ---`;
  return snapshot;
}

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

    // Load full data snapshot for this user's tenant
    const dataSnapshot = await loadUserDataSnapshot(ctx);

    // Build dynamic system prompt with the user's data
    const systemPrompt = BASE_SYSTEM_PROMPT + dataSnapshot;

    // Enrich context if a claim ID is mentioned or in scope
    let claimContext = '';
    const claimIdMatch = userMessage.match(/claim\s*#?\s*(\w{8}-\w{4}|\d{6,}|FC-\d+)/i);
    const claimId = ctx.claimId || (claimIdMatch ? claimIdMatch[1] : null);

    const corpFilter = ctx.isSuperAdmin ? {} : ctx.corporateId ? { corporateId: ctx.corporateId } : { createdById: ctx.userId };

    if (claimId) {
      const claim = await prisma.claim.findFirst({
        where: {
          ...corpFilter,
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
          parties: claim.parties.map((p: any) => ({ type: p.type, name: p.name })),
          documents: claim.documents.map((d: any) => d.documentName),
          recentTimeline: claim.timeline.map((t: any) => ({ date: t.createdAt, status: t.status, note: t.description })),
          pendingTasks: claim.tasks.map((t: any) => ({ title: t.title, priority: t.priority })),
          payments: claim.payments.map((p: any) => ({ amount: Number(p.amount), type: p.type })),
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

    const response = await chat(history, { systemInstruction: systemPrompt });

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
