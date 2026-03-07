/**
 * Status Follow-Up Agent - Autonomous claim status tracking and escalation
 *
 * Runs continuously in the background (triggered by cron or queue).
 * Checks carrier portals for updates, sends follow-up communications
 * when deadlines approach, and escalates stale claims through the
 * proper chain: follow-up → escalate → insurance → litigation recommendation.
 *
 * Location: apps/api/src/services/agents/followup.agent.ts
 */
import { generateContent } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

const SYSTEM_PROMPT = `You are the FreightClaims Follow-Up Agent. You monitor claim status and take appropriate escalation actions.

Follow-up workflow:
1. CHECK: Review claim status, last activity date, and pending deadlines
2. DECIDE: Based on time elapsed and status, pick the right action:
   - < 14 days since last activity, status=pending → No action needed
   - 14-30 days inactive → Send carrier follow-up email
   - 30-60 days inactive → Escalate to supervisor, send formal demand
   - 60-90 days inactive → Recommend insurance filing
   - 90+ days inactive → Recommend legal review / litigation
3. ACT: Create the appropriate follow-up task and draft communications

When drafting follow-up emails:
- First follow-up: Professional, request status update
- Second follow-up: Firm, reference previous request and deadlines
- Third follow-up: Formal demand letter citing Carmack Amendment obligations
- Final: Notice of intent to pursue legal remedies

Always include claim number, PRO number, filing date, and specific ask.`;

export const followupAgent: BaseAgent = {
  type: 'followup',
  name: 'Status Follow-Up Agent',
  description: 'Monitors claim progress, sends follow-up communications, and escalates stale claims through the appropriate chain.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const claimId = ctx.claimId || (ctx.input.claimId as string);

    if (!claimId) {
      return { agentType: 'followup', status: 'failed', result: 'No claim ID', summary: 'Missing claim ID' };
    }

    const claimResult = await executeTool('getClaim', { claimId }, ctx);
    if (!claimResult.success || !claimResult.data) {
      return { agentType: 'followup', status: 'failed', result: 'Claim not found', summary: 'Claim lookup failed' };
    }

    const claim = claimResult.data as any;

    // Determine the last meaningful activity date
    const timeline = (claim.timeline || []) as any[];
    const lastActivity = timeline.length > 0
      ? new Date(timeline[0].createdAt)
      : new Date(claim.updatedAt || claim.createdAt);
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / 86400000);

    // Determine escalation level
    let escalationLevel: 'none' | 'followup' | 'escalate' | 'insurance' | 'legal';
    if (daysSinceActivity < 14) escalationLevel = 'none';
    else if (daysSinceActivity < 30) escalationLevel = 'followup';
    else if (daysSinceActivity < 60) escalationLevel = 'escalate';
    else if (daysSinceActivity < 90) escalationLevel = 'insurance';
    else escalationLevel = 'legal';

    // Terminal statuses don't need follow-up
    const terminalStatuses = ['settled', 'closed', 'cancelled'];
    if (terminalStatuses.includes(claim.status)) {
      return {
        agentType: 'followup',
        status: 'completed',
        result: `Claim ${claim.claimNumber} is in terminal status (${claim.status}). No follow-up needed.`,
        structuredOutput: { escalationLevel: 'none', daysSinceActivity, claimStatus: claim.status },
        durationMs: Date.now() - start,
        summary: 'No follow-up needed — claim is resolved',
      };
    }

    if (escalationLevel === 'none') {
      return {
        agentType: 'followup',
        status: 'completed',
        result: `Claim ${claim.claimNumber} had activity ${daysSinceActivity} days ago. No follow-up needed yet.`,
        structuredOutput: { escalationLevel: 'none', daysSinceActivity },
        durationMs: Date.now() - start,
        summary: `Last activity ${daysSinceActivity} days ago — still within normal window`,
      };
    }

    // Generate appropriate follow-up communication
    const carrierParty = (claim.parties || []).find((p: any) => p.type === 'carrier');
    const { text: followUpDraft } = await generateContent(
      `Generate a ${escalationLevel}-level follow-up for this freight claim.

Escalation level: ${escalationLevel}
Days since last activity: ${daysSinceActivity}

Claim:
- Number: ${claim.claimNumber}
- PRO: ${claim.proNumber}
- Status: ${claim.status}
- Amount: $${claim.claimAmount}
- Filed: ${claim.filingDate || 'unknown'}
- Carrier: ${carrierParty?.name || 'Unknown'}

Recent timeline:
${timeline.slice(0, 5).map((t: any) => `  ${t.createdAt}: ${t.status} - ${t.description || ''}`).join('\n')}

Draft the appropriate ${escalationLevel === 'followup' ? 'follow-up email' : escalationLevel === 'escalate' ? 'formal demand letter' : escalationLevel === 'insurance' ? 'insurance filing recommendation' : 'legal action recommendation'}.`,
      { systemInstruction: SYSTEM_PROMPT },
    );

    // Create the follow-up task
    const priorityMap: Record<string, string> = {
      followup: 'medium',
      escalate: 'high',
      insurance: 'high',
      legal: 'urgent',
    };

    await executeTool('createTask', {
      claimId,
      title: `Follow-up required: ${escalationLevel} level (${daysSinceActivity} days inactive)`,
      description: `Auto-generated by Follow-Up Agent.\n\nEscalation: ${escalationLevel}\nDays inactive: ${daysSinceActivity}\n\nSee AI-drafted communication for review.`,
      priority: priorityMap[escalationLevel] || 'medium',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    }, ctx);

    await executeTool('addComment', {
      claimId,
      content: `[Follow-Up Agent] ${escalationLevel.toUpperCase()} level — ${daysSinceActivity} days since last activity. Task created for review.`,
      type: 'system',
    }, ctx);

    return {
      agentType: 'followup',
      status: 'completed',
      result: followUpDraft,
      structuredOutput: {
        escalationLevel,
        daysSinceActivity,
        draftCommunication: followUpDraft,
      },
      durationMs: Date.now() - start,
      summary: `${escalationLevel} escalation — ${daysSinceActivity} days inactive, draft communication generated`,
    };
  },
};
