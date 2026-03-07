/**
 * Claim Valuation Agent - Settlement prediction and strategy engine
 *
 * Analyzes historical settlement data, carrier behavior patterns, commodity risk,
 * and damage type to predict expected settlement ranges and recommend negotiation
 * strategies. This is the AI pricing engine for freight claims.
 *
 * Location: apps/api/src/services/agents/valuation.agent.ts
 */
import { generateJSON } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

const SYSTEM_PROMPT = `You are the FreightClaims Valuation Agent. You analyze freight claims to predict settlement outcomes and recommend negotiation strategies.

Factors you consider:
1. CLAIM AMOUNT vs historical settlements for similar claims
2. CARRIER BEHAVIOR: Some carriers settle quickly, others fight everything
3. CLAIM TYPE: Damage claims typically settle at 60-80%, loss claims at 40-70%
4. DOCUMENTATION STRENGTH: Complete docs = stronger position
5. LEGAL POSITION: Carmack compliance, clear liability chain
6. COMMODITY VALUE: High-value = more scrutiny, more negotiation
7. TIME IN PROCESS: Older claims = harder to settle at full value

Your output should be actionable for a claims handler making settlement decisions.`;

interface ValuationResult {
  claimedAmount: number;
  expectedSettlementLow: number;
  expectedSettlementHigh: number;
  expectedSettlementMid: number;
  settlementProbability: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  strategy: 'aggressive' | 'standard' | 'conservative' | 'litigation';
  reasoning: string;
  keyFactors: string[];
  recommendedActions: string[];
}

export const valuationAgent: BaseAgent = {
  type: 'valuation',
  name: 'Claim Valuation Agent',
  description: 'Predicts settlement ranges and recommends negotiation strategies based on historical data and claim characteristics.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const claimId = ctx.claimId || (ctx.input.claimId as string);

    if (!claimId) {
      return { agentType: 'valuation', status: 'failed', result: 'No claim ID', summary: 'Missing claim ID' };
    }

    const claimResult = await executeTool('getClaim', { claimId }, ctx);
    if (!claimResult.success) {
      return { agentType: 'valuation', status: 'failed', result: 'Claim not found', summary: 'Claim lookup failed' };
    }
    const claim = claimResult.data as Record<string, unknown>;

    const historyResult = await executeTool('getClaimHistory', {
      claimType: (claim as any).claimType,
    }, ctx);
    const history = historyResult.data as Record<string, unknown>;

    const carrierParty = ((claim as any).parties || []).find((p: any) => p.type === 'carrier');
    let carrierData = null;
    if (carrierParty?.scacCode) {
      const r = await executeTool('getCarrier', { scacCode: carrierParty.scacCode }, ctx);
      if (r.success) carrierData = r.data;
    }

    // Get documents count to assess documentation strength
    const docsResult = await executeTool('getClaimDocuments', { claimId }, ctx);
    const docCount = Array.isArray(docsResult.data) ? (docsResult.data as unknown[]).length : 0;

    const valuation = await generateJSON<ValuationResult>(
      `Analyze this freight claim and provide a valuation assessment.

CLAIM:
- Number: ${(claim as any).claimNumber}
- Type: ${(claim as any).claimType}
- Amount: $${(claim as any).claimAmount}
- Status: ${(claim as any).status}
- Filed: ${(claim as any).filingDate || 'not filed'}
- Documents on file: ${docCount}

CARRIER: ${carrierParty?.name || 'Unknown'} (SCAC: ${carrierParty?.scacCode || 'N/A'})

HISTORICAL SETTLEMENT DATA:
${JSON.stringify(history, null, 2)}

PRODUCTS:
${JSON.stringify((claim as any).products || [], null, 2)}

Return JSON: { claimedAmount, expectedSettlementLow, expectedSettlementHigh, expectedSettlementMid, settlementProbability (0-1), confidenceLevel ("low"|"medium"|"high"), strategy ("aggressive"|"standard"|"conservative"|"litigation"), reasoning (paragraph), keyFactors (array), recommendedActions (array) }`,
      { systemInstruction: SYSTEM_PROMPT },
    );

    await executeTool('addComment', {
      claimId,
      content: `[Valuation] Expected settlement: $${valuation.expectedSettlementLow.toLocaleString()}-$${valuation.expectedSettlementHigh.toLocaleString()} (${Math.round(valuation.settlementProbability * 100)}% probability). Strategy: ${valuation.strategy}.`,
      type: 'system',
    }, ctx);

    return {
      agentType: 'valuation',
      status: 'completed',
      result: valuation.reasoning,
      structuredOutput: valuation as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
      summary: `Valued at $${valuation.expectedSettlementMid.toLocaleString()} (${valuation.confidenceLevel} confidence), ${valuation.strategy} strategy recommended`,
    };
  },
};
