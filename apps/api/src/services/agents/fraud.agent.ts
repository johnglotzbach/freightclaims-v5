/**
 * Fraud Detection Agent - Identifies anomalies and suspicious claim patterns
 *
 * Checks for duplicate claims, amount anomalies, suspicious timing patterns,
 * and known fraud indicators across the claims portfolio.
 */
import { prisma } from '../../config/database';
import { generateJSON } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

interface FraudAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallScore: number;
  flags: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: string;
  }>;
  duplicateCheck: { hasPotentialDuplicates: boolean; matches: Array<{ claimNumber: string; matchScore: number }> };
  amountAnalysis: { isOutlier: boolean; percentile: number; detail: string };
  timingAnalysis: { isSuspicious: boolean; detail: string };
  recommendations: string[];
}

export const fraudAgent: BaseAgent = {
  type: 'fraud',
  name: 'Anomaly & Fraud Detection',
  description: 'Identifies duplicate claims, amount anomalies, suspicious timing patterns, and known fraud indicators.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();

    const claimId = ctx.claimId || (ctx.input.claimId as string);
    let claimData: any = null;

    if (claimId) {
      const result = await executeTool('getClaim', { claimId }, ctx);
      if (result.success && result.data) {
        claimData = result.data;
      }
    }

    if (!claimData && ctx.input.claimData) {
      claimData = ctx.input.claimData;
    }

    if (!claimData) {
      return {
        agentType: 'fraud',
        status: 'failed',
        result: claimId
          ? `Claim "${claimId}" not found or you do not have access to it. Please verify the claim ID.`
          : 'No claim ID provided. Please enter a valid claim ID to run fraud analysis.',
        durationMs: Date.now() - start,
      };
    }

    const corpFilter = ctx.isSuperAdmin ? {} : ctx.corporateId ? { corporateId: ctx.corporateId } : { createdById: ctx.userId };

    // Check for duplicate claims (same PRO, BOL, or similar details) scoped to tenant
    const potentialDuplicates = await prisma.claim.findMany({
      where: {
        ...corpFilter,
        id: { not: claimData.id },
        OR: [
          { proNumber: claimData.proNumber },
          {
            AND: [
              { claimType: claimData.claimType },
              { claimAmount: claimData.claimAmount },
              { customerId: claimData.customerId },
            ],
          },
        ],
      },
      select: { id: true, claimNumber: true, proNumber: true, claimAmount: true, status: true, createdAt: true },
      take: 10,
    });

    // Get historical claim amounts for this claim type to detect outliers (tenant-scoped)
    const historicalAmounts = await prisma.claim.findMany({
      where: { ...corpFilter, claimType: claimData.claimType, id: { not: claimData.id } },
      select: { claimAmount: true },
      orderBy: { claimAmount: 'asc' },
      take: 500,
    });

    const amounts = historicalAmounts.map((c: any) => Number(c.claimAmount));
    const currentAmount = Number(claimData.claimAmount);
    const percentile = amounts.length > 0
      ? amounts.filter((a: any) => a <= currentAmount).length / amounts.length
      : 0.5;
    const mean = amounts.length > 0 ? amounts.reduce((s: any, a: any) => s + a, 0) / amounts.length : 0;
    const stdDev = amounts.length > 1
      ? Math.sqrt(amounts.reduce((s: any, a: any) => s + (a - mean) ** 2, 0) / (amounts.length - 1))
      : 0;
    const zScore = stdDev > 0 ? (currentAmount - mean) / stdDev : 0;

    // Check claim filing timing
    const daysSinceDelivery = claimData.deliveryDate
      ? (Date.now() - new Date(claimData.deliveryDate).getTime()) / 86400000
      : null;

    const analysis = await generateJSON<FraudAnalysis>(
      `Analyze this freight claim for potential fraud or anomalies.

Claim:
${JSON.stringify({
  id: claimData.id,
  claimNumber: claimData.claimNumber,
  proNumber: claimData.proNumber,
  claimType: claimData.claimType,
  claimAmount: currentAmount,
  status: claimData.status,
  shipDate: claimData.shipDate,
  deliveryDate: claimData.deliveryDate,
  filingDate: claimData.filingDate,
  parties: claimData.parties?.map((p: any) => ({ type: p.type, name: p.name })),
}, null, 2)}

Potential Duplicates Found: ${potentialDuplicates.length}
${JSON.stringify(potentialDuplicates.map((d: any) => ({ claimNumber: d.claimNumber, proNumber: d.proNumber, amount: Number(d.claimAmount) })), null, 2)}

Amount Statistics:
- Current amount: $${currentAmount}
- Mean for ${claimData.claimType}: $${mean.toFixed(2)}
- Std deviation: $${stdDev.toFixed(2)}
- Z-score: ${zScore.toFixed(2)}
- Percentile: ${(percentile * 100).toFixed(1)}%

Timing:
- Days since delivery: ${daysSinceDelivery?.toFixed(0) || 'unknown'}

Return: { riskLevel, overallScore (0-100 where 0=no risk, 100=definite fraud), flags: [{ type, severity, description, evidence }], duplicateCheck: { hasPotentialDuplicates, matches: [{ claimNumber, matchScore }] }, amountAnalysis: { isOutlier, percentile, detail }, timingAnalysis: { isSuspicious, detail }, recommendations }`,
      { systemInstruction: 'You are a freight claims fraud analyst. Flag genuine anomalies but avoid false positives. Consider that high-value claims are not inherently fraudulent.' },
    );

    // Persist fraud flags
    if (analysis.flags.length > 0 && claimId) {
      await prisma.fraudFlag.createMany({
        data: analysis.flags.map((f) => ({
          claimId: claimId!,
          type: f.type,
          severity: f.severity,
          description: f.description,
          evidence: { detail: f.evidence } as any,
        })),
      }).catch(() => {});
    }

    return {
      agentType: 'fraud',
      status: 'completed',
      result: analysis,
      structuredOutput: { analysis, stats: { percentile, zScore, mean, stdDev, duplicateCount: potentialDuplicates.length } },
      durationMs: Date.now() - start,
      summary: `Risk level: ${analysis.riskLevel.toUpperCase()} (${analysis.overallScore}/100) — ${analysis.flags.length} flag(s) found`,
    };
  },
};
