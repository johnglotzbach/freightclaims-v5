/**
 * Carrier Negotiation Agent - Automated denial rebuttals and settlement negotiation
 *
 * Reads carrier denial letters, detects the defense strategy being used,
 * references applicable tariff rules and legal precedent, and generates
 * professional rebuttals. Designed for human-in-the-loop: generates the
 * response, but a claims handler approves before sending.
 *
 * Location: apps/api/src/services/agents/negotiation.agent.ts
 */
import { generateContent } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

const SYSTEM_PROMPT = `You are the FreightClaims Carrier Negotiation Agent. You specialize in drafting professional, legally-grounded rebuttals to carrier denials.

Common carrier denial defenses and how to counter them:

1. "PACKAGING INSUFFICIENT" → Counter: Carrier accepted goods without notation on BOL. Under Carmack, carrier's acceptance = acknowledgment of good condition. Cite: Missouri Pacific R.R. Co. v. Elmore & Stahl.

2. "ACT OF GOD" → Counter: Weather events must be unforeseeable and the sole proximate cause. Carrier must prove it took all reasonable precautions. Most weather-related denials don't meet this bar.

3. "INHERENT VICE" → Counter: Must be a quality in the goods themselves. Carrier bears burden of proof. Spoilage of properly refrigerated goods ≠ inherent vice if temp was not maintained.

4. "SHIPPER'S FAULT / SHIPPER LOAD & COUNT" → Counter: SL&C notation alone doesn't absolve carrier liability. Carrier must prove shipper's loading caused the specific damage.

5. "LATE FILING" → Counter: Verify actual dates. Carrier's own tracking data may show different delivery date. Filing is timely within 9 months of actual delivery.

6. "RELEASED VALUE" → Counter: Carrier must prove shipper was offered a choice of rates, understood the limitation, and agreed in writing. Check BOL for released value checkbox.

7. "CONCEALED DAMAGE" → Counter: Prompt notification + inspection request satisfies requirements. External carton condition may indicate rough handling.

When drafting rebuttals:
- Be professional and firm, not aggressive
- Cite specific legal standards and burden of proof
- Reference the specific documents in the claim file
- Suggest a settlement figure when appropriate
- Keep it concise (under 500 words for the rebuttal body)`;

export const negotiationAgent: BaseAgent = {
  type: 'negotiation',
  name: 'Carrier Negotiation Agent',
  description: 'Analyzes carrier denial letters and generates professional, legally-grounded rebuttals with settlement proposals.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const claimId = ctx.claimId || (ctx.input.claimId as string);
    const denialText = ctx.input.denialLetter || ctx.input.denialText || '';

    if (!claimId) {
      return { agentType: 'negotiation', status: 'failed', result: 'No claim ID provided', summary: 'Missing claim ID' };
    }

    // Get claim data
    const claimResult = await executeTool('getClaim', { claimId }, ctx);
    if (!claimResult.success) {
      return { agentType: 'negotiation', status: 'failed', result: 'Claim not found', summary: 'Claim lookup failed' };
    }
    const claim = claimResult.data as Record<string, unknown>;

    // Get historical settlement data for this carrier
    const historyResult = await executeTool('getClaimHistory', {
      claimType: (claim as any).claimType,
    }, ctx);
    const history = historyResult.data as Record<string, unknown>;

    // Analyze the denial and generate a rebuttal
    const { text: rebuttal } = await generateContent(
      `A carrier has denied this freight claim. Analyze the denial and draft a professional rebuttal letter.

CLAIM DETAILS:
- Claim Number: ${(claim as any).claimNumber}
- PRO: ${(claim as any).proNumber}
- Type: ${(claim as any).claimType}
- Amount: $${(claim as any).claimAmount}
- Carrier: ${((claim as any).parties || []).find((p: any) => p.type === 'carrier')?.name || 'Unknown'}

DENIAL LETTER/REASON:
"""
${denialText || 'No denial letter text provided. Analyze based on claim status and timeline.'}
"""

DOCUMENTS ON FILE:
${((claim as any).documents || []).map((d: any) => `- ${d.documentName}`).join('\n') || 'No documents listed'}

HISTORICAL DATA:
${JSON.stringify(history, null, 2)}

Draft:
1. A brief analysis of the carrier's defense strategy (2-3 sentences)
2. A professional rebuttal letter (under 500 words)
3. A recommended settlement approach with a specific dollar range`,
      { systemInstruction: SYSTEM_PROMPT },
    );

    await executeTool('addComment', {
      claimId,
      content: `[Negotiation Agent] Rebuttal drafted for review. See AI panel for full text.`,
      type: 'system',
    }, ctx);

    await executeTool('createTask', {
      claimId,
      title: 'Review AI-generated rebuttal before sending',
      description: 'The Negotiation Agent has drafted a rebuttal to the carrier denial. Review, edit if needed, and approve for sending.',
      priority: 'high',
    }, ctx);

    return {
      agentType: 'negotiation',
      status: 'completed',
      result: rebuttal,
      structuredOutput: { rebuttalDraft: rebuttal, historicalData: history },
      durationMs: Date.now() - start,
      summary: 'Rebuttal drafted and queued for human review',
    };
  },
};
