/**
 * Automated Carrier Communication Agent - Handles carrier correspondence
 *
 * Drafts and manages automated communications with carriers including
 * initial filing letters, follow-ups, acknowledgment requests, and
 * escalation notices. Monitors response deadlines.
 */
import { prisma } from '../../config/database';
import { generateJSON } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

interface CommunicationPlan {
  immediateActions: Array<{ action: string; template: string; recipient: string; priority: 'high' | 'medium' | 'low' }>;
  scheduledFollowUps: Array<{ action: string; scheduledDays: number; condition: string }>;
  deadlines: Array<{ type: string; date: string; daysRemaining: number; urgency: 'critical' | 'urgent' | 'normal' }>;
  draftEmail: { subject: string; body: string; to: string };
}

export const communicationAgent: BaseAgent = {
  type: 'communication',
  name: 'Automated Carrier Communication',
  description: 'Drafts carrier correspondence, manages follow-up schedules, and monitors response deadlines for Carmack compliance.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();

    let claimData: any = null;
    if (ctx.claimId) {
      const result = await executeTool('getClaim', { claimId: ctx.claimId }, ctx);
      if (result.success) claimData = result.data;
    }

    const actionType = ctx.input.actionType as string || 'auto';
    const carrierParty = claimData?.parties?.find((p: any) => p.type === 'carrier');
    const carrierEmail = carrierParty?.email || ctx.input.carrierEmail as string || '';

    // Determine claim age and compliance deadlines
    const filingDate = claimData?.filingDate ? new Date(claimData.filingDate) : null;
    const ackDate = claimData?.acknowledgmentDate ? new Date(claimData.acknowledgmentDate) : null;
    const now = new Date();

    const daysSinceFiling = filingDate ? Math.floor((now.getTime() - filingDate.getTime()) / 86400000) : null;
    const ackDeadline = filingDate ? new Date(filingDate.getTime() + 30 * 86400000) : null;
    const dispositionDeadline = filingDate ? new Date(filingDate.getTime() + 120 * 86400000) : null;

    const corpFilter = ctx.isSuperAdmin ? {} : ctx.corporateId ? { claim: { corporateId: ctx.corporateId } } : {};

    // Get recent email history for this claim (tenant-scoped)
    const emailHistory = ctx.claimId
      ? await prisma.emailLog.findMany({
          where: { claimId: ctx.claimId, ...corpFilter },
          select: { subject: true, direction: true, createdAt: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [];

    const plan = await generateJSON<CommunicationPlan>(
      `Create a communication plan for this freight claim.

Action requested: ${actionType}
Claim: ${claimData?.claimNumber || 'N/A'}
Carrier: ${carrierParty?.name || 'Unknown'} (${carrierParty?.scacCode || ''})
Carrier email: ${carrierEmail}
Status: ${claimData?.status || 'unknown'}
Days since filing: ${daysSinceFiling ?? 'not filed yet'}
Acknowledgment received: ${ackDate ? 'Yes, on ' + ackDate.toISOString().split('T')[0] : 'No'}
Acknowledgment deadline: ${ackDeadline?.toISOString().split('T')[0] || 'N/A'}
Disposition deadline: ${dispositionDeadline?.toISOString().split('T')[0] || 'N/A'}
Claim amount: $${claimData ? Number(claimData.claimAmount).toFixed(2) : 'TBD'}

Recent email history:
${JSON.stringify(emailHistory.slice(0, 10), null, 2)}

Generate:
1. Immediate actions needed
2. Scheduled follow-ups with day intervals
3. Upcoming compliance deadlines
4. A draft email appropriate for the current claim status

Return: { immediateActions: [{ action, template, recipient, priority }], scheduledFollowUps: [{ action, scheduledDays, condition }], deadlines: [{ type, date, daysRemaining, urgency }], draftEmail: { subject, body, to } }`,
      { systemInstruction: 'You are a freight claims communication specialist. Draft professional carrier correspondence. Follow Carmack Amendment timing requirements. Be firm but professional.' },
    );

    // Create tasks for follow-ups
    if (ctx.claimId && plan.scheduledFollowUps.length > 0) {
      const tasks = plan.scheduledFollowUps.map((fu) => ({
        claimId: ctx.claimId!,
        title: fu.action,
        description: fu.condition,
        priority: 'medium' as const,
        dueDate: new Date(now.getTime() + fu.scheduledDays * 86400000),
        createdById: ctx.userId,
      }));

      await prisma.claimTask.createMany({ data: tasks }).catch(() => {});
    }

    return {
      agentType: 'communication',
      status: 'completed',
      result: plan,
      structuredOutput: { plan, emailHistory: emailHistory.length, daysSinceFiling },
      durationMs: Date.now() - start,
      summary: `${plan.immediateActions.length} immediate action(s), ${plan.scheduledFollowUps.length} follow-up(s) scheduled, ${plan.deadlines.length} deadline(s) tracked`,
    };
  },
};
