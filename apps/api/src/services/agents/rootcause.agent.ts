/**
 * Root Cause Analysis Agent - Identifies patterns and root causes across claims
 *
 * Analyzes clusters of claims to identify systemic issues: recurring carrier
 * problems, packaging deficiencies, route-specific damage patterns, seasonal
 * trends, and operational bottlenecks.
 */
import { prisma } from '../../config/database';
import { generateJSON } from './gemini-client';
import type { BaseAgent, AgentContext, AgentResult } from './types';

interface RootCauseAnalysis {
  topCauses: Array<{
    cause: string;
    frequency: number;
    affectedClaimCount: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'carrier' | 'packaging' | 'routing' | 'seasonal' | 'operational' | 'external';
  }>;
  patterns: Array<{ pattern: string; detail: string; claimCount: number }>;
  correlations: Array<{ factorA: string; factorB: string; correlation: number; interpretation: string }>;
  recommendations: Array<{ action: string; expectedImpact: string; priority: 'high' | 'medium' | 'low'; estimatedSavings: string }>;
  summary: string;
}

export const rootcauseAgent: BaseAgent = {
  type: 'rootcause',
  name: 'Predictive Root Cause Analysis',
  description: 'Analyzes claim clusters to identify systemic issues, recurring patterns, and root causes across carriers, routes, and commodities.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();

    const timeRange = ctx.input.timeRange as string || '90d';
    const days = parseInt(timeRange) || 90;
    const since = new Date(Date.now() - days * 86400000);

    const corporateFilter = ctx.input.corporateId
      ? { corporateId: ctx.input.corporateId as string }
      : {};

    // Aggregate claim data for analysis
    const claims = await prisma.claim.findMany({
      where: { createdAt: { gte: since }, ...corporateFilter },
      select: {
        id: true, claimType: true, claimAmount: true, settledAmount: true,
        status: true, description: true, shipDate: true, deliveryDate: true,
        parties: { select: { type: true, name: true, scacCode: true, city: true, state: true } },
        products: { select: { description: true, damageType: true, weight: true } },
      },
      take: 1000,
    });

    // Compute aggregated stats per carrier
    const carrierStats: Record<string, { name: string; count: number; denied: number; totalAmount: number; types: Record<string, number> }> = {};
    const typeStats: Record<string, number> = {};
    const routeStats: Record<string, number> = {};

    for (const claim of claims) {
      typeStats[claim.claimType] = (typeStats[claim.claimType] || 0) + 1;

      const carrier = claim.parties.find((p) => p.type === 'carrier');
      if (carrier?.scacCode) {
        if (!carrierStats[carrier.scacCode]) {
          carrierStats[carrier.scacCode] = { name: carrier.name, count: 0, denied: 0, totalAmount: 0, types: {} };
        }
        const cs = carrierStats[carrier.scacCode];
        cs.count++;
        cs.totalAmount += Number(claim.claimAmount);
        cs.types[claim.claimType] = (cs.types[claim.claimType] || 0) + 1;
        if (claim.status === 'denied') cs.denied++;
      }

      const origin = claim.parties.find((p) => p.type === 'shipper');
      const dest = claim.parties.find((p) => p.type === 'consignee');
      if (origin?.state && dest?.state) {
        const route = `${origin.state}->${dest.state}`;
        routeStats[route] = (routeStats[route] || 0) + 1;
      }
    }

    const analysis = await generateJSON<RootCauseAnalysis>(
      `Perform root cause analysis on this freight claims data from the past ${days} days.

Total claims: ${claims.length}

Claims by type:
${JSON.stringify(typeStats, null, 2)}

Top carriers by claim count:
${JSON.stringify(
  Object.entries(carrierStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([scac, s]) => ({ scac, ...s })),
  null, 2,
)}

Top routes by claim count:
${JSON.stringify(
  Object.entries(routeStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10),
  null, 2,
)}

Sample damage descriptions:
${claims.slice(0, 20).map((c) => c.description).filter(Boolean).join('\n')}

Identify root causes, patterns, correlations, and actionable recommendations.

Return: { topCauses: [{ cause, frequency, affectedClaimCount, severity, category }], patterns: [{ pattern, detail, claimCount }], correlations: [{ factorA, factorB, correlation, interpretation }], recommendations: [{ action, expectedImpact, priority, estimatedSavings }], summary }`,
      { systemInstruction: 'You are a freight claims operations analyst. Identify genuine root causes from the data, not just symptoms. Focus on actionable insights that can reduce future claims.' },
    );

    return {
      agentType: 'rootcause',
      status: 'completed',
      result: analysis,
      structuredOutput: { analysis, stats: { totalClaims: claims.length, timeRange: `${days}d`, carrierCount: Object.keys(carrierStats).length } },
      durationMs: Date.now() - start,
      summary: `Analyzed ${claims.length} claims over ${days} days — found ${analysis.topCauses.length} root cause(s) and ${analysis.recommendations.length} recommendation(s)`,
    };
  },
};
