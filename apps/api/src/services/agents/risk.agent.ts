/**
 * Carrier Risk Scoring Agent - Evaluates carrier reliability and risk factors
 *
 * Analyzes claim history, resolution patterns, payment speeds, and communication
 * responsiveness to generate a risk score for each carrier.
 */
import { prisma } from '../../config/database';
import { generateJSON } from './gemini-client';
import type { BaseAgent, AgentContext, AgentResult } from './types';

interface RiskAssessment {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    claimFrequency: { score: number; detail: string };
    resolutionSpeed: { score: number; detail: string };
    paymentReliability: { score: number; detail: string };
    denialRate: { score: number; detail: string };
    communicationScore: { score: number; detail: string };
  };
  trends: Array<{ metric: string; direction: 'improving' | 'declining' | 'stable'; detail: string }>;
  recommendations: string[];
  riskFlags: string[];
}

export const riskAgent: BaseAgent = {
  type: 'risk',
  name: 'Carrier Risk Scoring',
  description: 'Evaluates carrier reliability by analyzing claim history, resolution patterns, payment speeds, and communication responsiveness.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const carrierId = ctx.input.carrierId as string;
    const carrierScac = ctx.input.carrierScac as string;

    // Fetch carrier info
    const carrier = carrierId
      ? await prisma.carrier.findUnique({ where: { id: carrierId }, include: { contacts: true } })
      : carrierScac
        ? await prisma.carrier.findUnique({ where: { scacCode: carrierScac.toUpperCase() }, include: { contacts: true } })
        : null;

    if (!carrier) {
      return {
        agentType: 'risk',
        status: 'failed',
        result: 'Carrier not found',
        durationMs: Date.now() - start,
        summary: 'Could not find carrier for risk assessment',
      };
    }

    // Fetch all claims involving this carrier
    const claims = await prisma.claim.findMany({
      where: {
        parties: { some: { scacCode: carrier.scacCode, type: 'carrier' } },
      },
      select: {
        id: true, status: true, claimType: true, claimAmount: true,
        settledAmount: true, filingDate: true, acknowledgmentDate: true,
        createdAt: true, updatedAt: true,
        payments: { select: { amount: true, receivedAt: true, createdAt: true } },
        timeline: { select: { status: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Compute raw statistics
    const totalClaims = claims.length;
    const settled = claims.filter((c) => ['settled', 'closed', 'approved'].includes(c.status));
    const denied = claims.filter((c) => c.status === 'denied');
    const avgClaimAmount = totalClaims > 0
      ? claims.reduce((s, c) => s + Number(c.claimAmount), 0) / totalClaims
      : 0;

    const resolutionTimes = claims
      .filter((c) => c.timeline.length > 1)
      .map((c) => {
        const firstEntry = c.timeline[0]?.createdAt;
        const lastEntry = c.timeline[c.timeline.length - 1]?.createdAt;
        if (firstEntry && lastEntry) return (lastEntry.getTime() - firstEntry.getTime()) / 86400000;
        return null;
      })
      .filter(Boolean) as number[];

    const avgResolutionDays = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((s, d) => s + d, 0) / resolutionTimes.length)
      : null;

    const paymentDelays = claims
      .flatMap((c) => c.payments)
      .filter((p) => p.receivedAt)
      .map((p) => (p.receivedAt!.getTime() - p.createdAt.getTime()) / 86400000);

    const avgPaymentDelay = paymentDelays.length > 0
      ? Math.round(paymentDelays.reduce((s, d) => s + d, 0) / paymentDelays.length)
      : null;

    const stats = {
      carrierName: carrier.name,
      scacCode: carrier.scacCode,
      totalClaims,
      approvedCount: settled.length,
      deniedCount: denied.length,
      approvalRate: totalClaims > 0 ? settled.length / totalClaims : 0,
      denialRate: totalClaims > 0 ? denied.length / totalClaims : 0,
      avgClaimAmount,
      avgResolutionDays,
      avgPaymentDelay,
    };

    const assessment = await generateJSON<RiskAssessment>(
      `Assess the risk profile of this freight carrier based on their claims history.

Carrier: ${carrier.name} (${carrier.scacCode})
Statistics:
${JSON.stringify(stats, null, 2)}

Score each factor 0-100 (100 = best/least risky).
Overall score should be a weighted average.
Grade: A (90-100), B (80-89), C (70-79), D (60-69), F (<60).

Return: { overallScore (0-100), grade, factors: { claimFrequency: { score, detail }, resolutionSpeed: { score, detail }, paymentReliability: { score, detail }, denialRate: { score, detail }, communicationScore: { score, detail } }, trends: [{ metric, direction, detail }], recommendations (array), riskFlags (array) }`,
      { systemInstruction: 'You are a freight claims risk analyst. Be objective and data-driven. If data is limited, note that and adjust confidence accordingly.' },
    );

    // Persist the score
    await prisma.carrierRiskScore.create({
      data: {
        carrierId: carrier.id,
        overallScore: assessment.overallScore,
        claimRate: stats.approvalRate,
        avgResolutionDays: stats.avgResolutionDays,
        denialRate: stats.denialRate,
        paymentSpeed: stats.avgPaymentDelay,
        factors: assessment as any,
      },
    }).catch(() => {});

    return {
      agentType: 'risk',
      status: 'completed',
      result: assessment,
      structuredOutput: { assessment, stats, carrier: { id: carrier.id, name: carrier.name, scacCode: carrier.scacCode } },
      durationMs: Date.now() - start,
      summary: `${carrier.name} scored ${assessment.overallScore}/100 (${assessment.grade}) — ${stats.totalClaims} claims analyzed, ${Math.round(stats.denialRate * 100)}% denial rate`,
    };
  },
};
