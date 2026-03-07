/**
 * Denial Response Agent - Generates smart responses to carrier claim denials
 *
 * Analyzes denial reasons, identifies legal grounds for appeal, drafts
 * professional rebuttal letters citing Carmack Amendment provisions and
 * relevant case law.
 */
import { generateContent, generateJSON } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

interface DenialAnalysis {
  denialReasons: string[];
  rebuttableReasons: Array<{ reason: string; rebuttalBasis: string; strength: 'strong' | 'moderate' | 'weak' }>;
  legalGrounds: string[];
  appealRecommendation: 'strongly_recommend' | 'recommend' | 'consider' | 'unlikely_success';
  appealSuccessProbability: number;
  suggestedActions: string[];
}

export const denialAgent: BaseAgent = {
  type: 'denial',
  name: 'Smart Denial Response Generator',
  description: 'Analyzes carrier denial reasons and generates professional appeal letters citing Carmack Amendment and relevant precedent.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();

    let claimData: any = null;
    if (ctx.claimId) {
      const result = await executeTool('getClaim', { claimId: ctx.claimId }, ctx);
      if (result.success) claimData = result.data;
    }

    const denialText = ctx.input.denialText as string || ctx.input.denialReason as string || '';
    const carrierName = ctx.input.carrierName as string || claimData?.parties?.find((p: any) => p.type === 'carrier')?.name || 'Carrier';

    // Analyze the denial
    const analysis = await generateJSON<DenialAnalysis>(
      `Analyze this freight claim denial and identify grounds for appeal.

Claim Details:
${JSON.stringify(claimData ? {
  claimNumber: claimData.claimNumber,
  proNumber: claimData.proNumber,
  claimType: claimData.claimType,
  claimAmount: Number(claimData.claimAmount),
  shipDate: claimData.shipDate,
  deliveryDate: claimData.deliveryDate,
  filingDate: claimData.filingDate,
  description: claimData.description,
  documents: claimData.documents?.map((d: any) => d.documentName),
} : ctx.input, null, 2)}

Denial Text:
"""
${denialText}
"""

Under the Carmack Amendment (49 USC 14706):
- Carrier is strictly liable for loss/damage during transit
- Claimant must prove: (1) goods in good condition when tendered, (2) arrived damaged/short, (3) amount of damages
- Carrier defenses: act of God, public enemy, act of shipper, public authority, inherent nature of goods
- 9-month filing deadline from delivery date
- Carrier must acknowledge within 30 days, provide disposition within 120 days

Return: { denialReasons (array), rebuttableReasons: [{ reason, rebuttalBasis, strength }], legalGrounds (array), appealRecommendation, appealSuccessProbability (0-1), suggestedActions }`,
      { systemInstruction: 'You are a freight claims legal specialist. Analyze denial reasons through the lens of the Carmack Amendment and common carrier law. Be thorough but realistic about appeal chances.' },
    );

    // Draft the rebuttal letter
    const { text: rebuttalLetter } = await generateContent(
      `Draft a professional appeal/rebuttal letter for this freight claim denial.

Carrier: ${carrierName}
Claim Number: ${claimData?.claimNumber || 'TBD'}
PRO Number: ${claimData?.proNumber || ctx.input.proNumber || 'TBD'}
Claim Amount: $${claimData ? Number(claimData.claimAmount).toFixed(2) : ctx.input.claimAmount || 'TBD'}

Denial Analysis:
${JSON.stringify(analysis, null, 2)}

Draft a professional, firm but diplomatic letter that:
1. References specific denial reasons and rebuts each one
2. Cites the Carmack Amendment where applicable
3. Lists supporting documentation already provided
4. Requests reconsideration with a clear deadline
5. Mentions escalation options if needed

Format as a proper business letter.`,
      { systemInstruction: 'Write in a professional, authoritative tone. Do not be aggressive but be firm about the legal basis. Use proper freight industry terminology.' },
    );

    // Generate a brief AI email suggestion
    const { text: emailSuggestion } = await generateContent(
      `Write a concise 3-4 sentence email to send to ${carrierName} along with the attached rebuttal letter for claim ${claimData?.claimNumber || 'TBD'}.`,
      { systemInstruction: 'Write a brief, professional email body that references the attached rebuttal letter. Keep it under 100 words.' },
    );

    return {
      agentType: 'denial',
      status: 'completed',
      result: {
        analysis,
        rebuttalLetter,
        emailSuggestion,
      },
      structuredOutput: { analysis, rebuttalLetter, emailSuggestion },
      durationMs: Date.now() - start,
      summary: `Appeal ${analysis.appealRecommendation.replace('_', ' ')} (${Math.round(analysis.appealSuccessProbability * 100)}% success probability) — ${analysis.rebuttableReasons.length} rebuttable reason(s) found`,
    };
  },
};
