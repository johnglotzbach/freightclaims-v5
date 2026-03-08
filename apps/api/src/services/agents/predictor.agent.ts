/**
 * Outcome Predictor Agent - Predicts claim outcomes, settlement amounts, and timelines
 *
 * Analyzes historical settlement data, carrier behavior patterns, claim type
 * statistics, and current claim details to predict likely outcomes.
 */
import { prisma } from '../../config/database';
import { generateJSON, generateContent } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

interface OutcomePrediction {
  likelyOutcome: 'approved' | 'denied' | 'partial_settlement' | 'full_settlement';
  outcomeProbability: number;
  estimatedSettlement: { min: number; max: number; expected: number };
  estimatedResolutionDays: number;
  denialRisk: number;
  keyFactors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }>;
  recommendations: string[];
  similarCasesCount: number;
}

const SYSTEM_PROMPT = `You are a freight claims outcome prediction specialist. Given claim details and historical data, predict the most likely outcome.

Consider these factors:
- Carrier's historical approval/denial rates
- Claim type and typical resolution patterns
- Claimed amount relative to carrier's typical settlements
- Document completeness
- Filing timeliness (Carmack Amendment deadlines)
- Carrier's average resolution time

Be data-driven and conservative in predictions. Express uncertainty when data is limited.`;

export const predictorAgent: BaseAgent = {
  type: 'predictor',
  name: 'Claim Outcome Predictor',
  description: 'Predicts claim outcomes, settlement ranges, and resolution timelines based on historical patterns and carrier behavior.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();

    // Get the claim details
    let claimData: any = null;
    if (ctx.claimId) {
      const result = await executeTool('getClaim', { claimId: ctx.claimId }, ctx);
      if (result.success) claimData = result.data;
    }

    // Get historical settlement data
    const historyResult = await executeTool('getClaimHistory', {
      claimType: claimData?.claimType || ctx.input.claimType,
    }, ctx);

    // Get carrier-specific history if available
    const carrierScac = claimData?.parties?.find((p: any) => p.type === 'carrier')?.scacCode
      || ctx.input.carrierScac;

    const corpFilter = ctx.isSuperAdmin ? {} : ctx.corporateId ? { corporateId: ctx.corporateId } : { createdById: ctx.userId };

    let carrierHistory = null;
    if (carrierScac) {
      const carrierClaims = await prisma.claim.findMany({
        where: {
          ...corpFilter,
          parties: { some: { scacCode: carrierScac as string, type: 'carrier' } },
          status: { in: ['settled', 'closed', 'denied', 'approved'] },
        },
        select: {
          status: true, claimAmount: true, settledAmount: true, claimType: true,
          filingDate: true, acknowledgmentDate: true, createdAt: true, updatedAt: true,
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      const approved = carrierClaims.filter((c: any) => ['settled', 'closed', 'approved'].includes(c.status));
      const denied = carrierClaims.filter((c: any) => c.status === 'denied');
      const avgSettlement = approved.length > 0
        ? approved.reduce((s: any, c: any) => s + Number(c.settledAmount || c.claimAmount), 0) / approved.length
        : 0;

      carrierHistory = {
        totalClaims: carrierClaims.length,
        approvalRate: carrierClaims.length > 0 ? approved.length / carrierClaims.length : 0,
        denialRate: carrierClaims.length > 0 ? denied.length / carrierClaims.length : 0,
        avgSettlement,
      };
    }

    // Check document completeness
    let docStatus = null;
    if (ctx.claimId) {
      const docsResult = await executeTool('checkMissingDocuments', {
        claimId: ctx.claimId,
        claimType: claimData?.claimType,
      }, ctx);
      if (docsResult.success) docStatus = docsResult.data;
    }

    const prediction = await generateJSON<OutcomePrediction>(
      `Predict the outcome of this freight claim based on the data provided.

Claim Details:
${JSON.stringify(claimData || ctx.input, null, 2)}

Historical Settlement Data:
${JSON.stringify(historyResult.data || {}, null, 2)}

Carrier History:
${JSON.stringify(carrierHistory || 'No carrier-specific data available', null, 2)}

Document Status:
${JSON.stringify(docStatus || 'Unknown', null, 2)}

Return: { likelyOutcome (approved|denied|partial_settlement|full_settlement), outcomeProbability (0-1), estimatedSettlement: { min, max, expected }, estimatedResolutionDays, denialRisk (0-1), keyFactors: [{ factor, impact (positive|negative|neutral), weight (0-1) }], recommendations (array of strings), similarCasesCount }`,
      { systemInstruction: SYSTEM_PROMPT },
    );

    // Persist prediction
    if (ctx.claimId) {
      await prisma.claimPrediction.create({
        data: {
          claimId: ctx.claimId,
          type: 'outcome',
          prediction: prediction as any,
          confidence: prediction.outcomeProbability,
          modelVersion: 'gemini-2.0-flash-v1',
        },
      }).catch(() => {});
    }

    const { text: summary } = await generateContent(
      `Write a 2-3 sentence summary of this claim outcome prediction for a claims handler:\n${JSON.stringify(prediction, null, 2)}`,
      { systemInstruction: 'Be direct and actionable. Mention the likely outcome, estimated settlement range, and top recommendation.' },
    );

    return {
      agentType: 'predictor',
      status: 'completed',
      result: summary,
      structuredOutput: { prediction, carrierHistory, docStatus },
      durationMs: Date.now() - start,
      summary: `Predicted ${prediction.likelyOutcome} with ${Math.round(prediction.outcomeProbability * 100)}% confidence — settlement range $${prediction.estimatedSettlement.min}-$${prediction.estimatedSettlement.max}`,
    };
  },
};
