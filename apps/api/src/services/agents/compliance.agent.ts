/**
 * Legal Compliance Agent - Carmack Amendment timeline and compliance checker
 *
 * The "secret sauce" agent. Encodes all Carmack Amendment timelines and
 * carrier liability rules, then continuously monitors claims for violations,
 * upcoming deadlines, and carrier non-compliance.
 *
 * Key timelines enforced:
 *   - 30 days:  Carrier must acknowledge receipt of claim
 *   - 120 days: Carrier must issue disposition (approve/deny)
 *   - 9 months: Shipper filing window from delivery date
 *   - 2yr+1day: Statute of limitations for lawsuit
 *
 * Location: apps/api/src/services/agents/compliance.agent.ts
 */
import { generateContent } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

const SYSTEM_PROMPT = `You are the FreightClaims Legal Compliance Agent, an expert in the Carmack Amendment (49 U.S.C. § 14706) and freight claim regulations.

Key Carmack Amendment rules you enforce:

1. CARRIER LIABILITY: Interstate motor carriers are liable for actual loss or injury to property they receive for transport, unless they prove it was caused by an act of God, public enemy, act of shipper, public authority, or inherent vice/nature of goods.

2. ACKNOWLEDGMENT (30 days): Carrier must acknowledge receipt of a claim in writing within 30 days. Failure = regulatory violation.

3. DISPOSITION (120 days): Carrier must pay, deny, or make a firm compromise settlement offer within 120 days of receiving the claim. If they can't, they must notify the claimant of the delay every 60 days thereafter.

4. FILING WINDOW (9 months): Claims must be filed within 9 months of the delivery date (or reasonable delivery date if shipment is lost).

5. STATUTE OF LIMITATIONS (2 years + 1 day): Lawsuit must be filed within 2 years and 1 day from the date the carrier issues a written denial.

6. BURDEN OF PROOF: Claimant must show (a) goods were in good condition when tendered to carrier, (b) goods arrived damaged/short/lost, and (c) the amount of damages.

7. RELEASED RATES: If the shipper accepted a released value rate, carrier liability may be limited to the released value.

8. DOCUMENTATION REQUIREMENTS: Valid claim needs BOL, delivery receipt/POD, invoice proving value, and damage evidence.

When analyzing claims, flag any violations, upcoming deadlines, and recommended actions.`;

export const complianceAgent: BaseAgent = {
  type: 'compliance',
  name: 'Legal Compliance Agent',
  description: 'Checks Carmack Amendment compliance, tracks filing deadlines, and flags carrier violations.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const claimId = ctx.claimId || (ctx.input.claimId as string);

    if (!claimId) {
      return {
        agentType: 'compliance',
        status: 'failed',
        result: 'No claim ID provided for compliance check',
        summary: 'Missing claim ID',
      };
    }

    // Get full claim data including timeline
    const claimResult = await executeTool('getClaim', { claimId }, ctx);
    if (!claimResult.success || !claimResult.data) {
      return {
        agentType: 'compliance',
        status: 'failed',
        result: `Claim ${claimId} not found`,
        summary: 'Claim not found',
      };
    }

    const claim = claimResult.data as Record<string, unknown>;
    const now = new Date();

    // Calculate raw deadline data for the prompt
    const deliveryDate = (claim as any).deliveryDate ? new Date((claim as any).deliveryDate) : null;
    const filingDate = (claim as any).filingDate ? new Date((claim as any).filingDate) : null;
    const ackDate = (claim as any).acknowledgmentDate ? new Date((claim as any).acknowledgmentDate) : null;

    const deadlineContext = {
      deliveryDate: deliveryDate?.toISOString() || 'unknown',
      filingDate: filingDate?.toISOString() || 'not yet filed',
      acknowledgmentDate: ackDate?.toISOString() || 'not received',
      daysSinceDelivery: deliveryDate ? Math.floor((now.getTime() - deliveryDate.getTime()) / 86400000) : null,
      daysSinceFiling: filingDate ? Math.floor((now.getTime() - filingDate.getTime()) / 86400000) : null,
      claimStatus: (claim as any).status,
      timelineEntries: ((claim as any).timeline || []).map((t: any) => `${t.createdAt}: ${t.status} - ${t.description || ''}`),
      documents: ((claim as any).documents || []).map((d: any) => d.documentName),
    };

    const { text: analysis } = await generateContent(
      `Perform a comprehensive Carmack Amendment compliance check on this freight claim.

Claim: ${JSON.stringify({
        claimNumber: (claim as any).claimNumber,
        proNumber: (claim as any).proNumber,
        status: (claim as any).status,
        claimType: (claim as any).claimType,
        claimAmount: (claim as any).claimAmount,
        settledAmount: (claim as any).settledAmount,
      }, null, 2)}

Deadline Context: ${JSON.stringify(deadlineContext, null, 2)}

Today's date: ${now.toISOString()}

Analyze all Carmack deadlines, identify any violations or upcoming risks, and provide specific recommendations. Format as a structured compliance report.`,
      { systemInstruction: SYSTEM_PROMPT },
    );

    // Flag any urgent issues by creating tasks
    const isUrgent = analysis.toLowerCase().includes('violation') || analysis.toLowerCase().includes('overdue');

    if (isUrgent) {
      await executeTool('createTask', {
        claimId,
        title: 'URGENT: Compliance issue detected by AI',
        description: `The Compliance Agent flagged this claim for immediate review.\n\n${analysis.slice(0, 500)}`,
        priority: 'urgent',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      }, ctx);
    }

    await executeTool('addComment', {
      claimId,
      content: `[Compliance Check] ${isUrgent ? '⚠️ ISSUES FOUND' : '✓ No immediate concerns'}\n\n${analysis.slice(0, 1000)}`,
      type: 'system',
    }, ctx);

    return {
      agentType: 'compliance',
      status: 'completed',
      result: analysis,
      structuredOutput: { isUrgent, deadlineContext },
      durationMs: Date.now() - start,
      summary: isUrgent
        ? 'Compliance issues detected — urgent task created'
        : 'Claim is compliant with all Carmack timelines',
    };
  },
};
