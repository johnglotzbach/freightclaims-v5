'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/loading';
import {
  Brain, Sparkles, ChevronRight, AlertTriangle, TrendingUp, BarChart3,
  Target, Lightbulb, ArrowRight, Layers, DollarSign,
} from 'lucide-react';

interface RootCause {
  cause: string;
  frequency: number;
  affectedClaimCount: number;
  severity: string;
  category: string;
}

interface Pattern {
  pattern: string;
  detail: string;
  claimCount: number;
}

interface Correlation {
  factorA: string;
  factorB: string;
  correlation: number;
  interpretation: string;
}

interface Recommendation {
  action: string;
  expectedImpact: string;
  priority: string;
  estimatedSavings: string;
}

interface RootCauseAnalysis {
  topCauses: RootCause[];
  patterns: Pattern[];
  correlations: Correlation[];
  recommendations: Recommendation[];
  summary: string;
}

function severityColor(severity: string) {
  const map: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  };
  return map[severity] || map.medium;
}

function categoryIcon(category: string) {
  const map: Record<string, string> = {
    carrier: 'Truck',
    packaging: 'Package',
    routing: 'Map',
    seasonal: 'Sun',
    operational: 'Cog',
    external: 'Globe',
  };
  return map[category] || 'CircleDot';
}

function priorityColor(priority: string) {
  const map: Record<string, string> = {
    high: 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5',
    medium: 'border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5',
    low: 'border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5',
  };
  return map[priority] || map.medium;
}

export default function RootCauseAnalysisPage() {
  const [timeRange, setTimeRange] = useState('90d');
  const [result, setResult] = useState<{ analysis: RootCauseAnalysis; stats: any } | null>(null);

  const rcMutation = useMutation({
    mutationFn: (data: any) => post<any>('/ai/agents/rootcause', data),
    onSuccess: (data) => {
      setResult(data.structuredOutput);
    },
  });

  const handleAnalyze = () => {
    rcMutation.mutate({ timeRange });
  };

  const analysis = result?.analysis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary-500" /> Root Cause Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          AI-powered pattern detection that identifies systemic issues across carriers, routes, and commodities.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="180d">Last 6 months</option>
              <option value="365d">Last 12 months</option>
            </select>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={rcMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {rcMutation.isPending ? (
              <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Brain className="w-4 h-4" /> Run Analysis</>
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card p-5 bg-gradient-to-r from-primary-50/50 to-transparent dark:from-primary-500/5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{analysis.summary}</p>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-slate-500">
              <span>{result.stats.totalClaims} claims analyzed</span>
              <span>{result.stats.carrierCount} carriers</span>
              <span>{result.stats.timeRange} window</span>
            </div>
          </div>

          {/* Top Causes */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-500" /> Top Root Causes
            </h3>
            <div className="space-y-3">
              {analysis.topCauses.map((cause, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cause.cause}</span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', severityColor(cause.severity))}>{cause.severity}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{cause.category}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {cause.affectedClaimCount} claims affected — occurred {cause.frequency} times
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Patterns */}
          {analysis.patterns?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-500" /> Detected Patterns
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.patterns.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.pattern}</div>
                    <div className="text-xs text-slate-400 mt-1">{p.detail}</div>
                    <div className="text-xs text-primary-500 mt-1">{p.claimCount} claims</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correlations */}
          {analysis.correlations?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" /> Correlations
              </h3>
              <div className="space-y-3">
                {analysis.correlations.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.factorA}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.factorB}</span>
                    </div>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full ml-auto',
                      c.correlation >= 0.7 ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                      c.correlation >= 0.4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    )}>
                      {Math.round(c.correlation * 100)}%
                    </span>
                    <span className="text-xs text-slate-400 hidden lg:inline">{c.interpretation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary-500" /> Actionable Recommendations
              </h3>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className={cn('p-4 rounded-lg border', priorityColor(rec.priority))}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{rec.action}</div>
                        <div className="text-xs text-slate-400 mt-1">{rec.expectedImpact}</div>
                      </div>
                      {rec.estimatedSavings && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 whitespace-nowrap">
                          <DollarSign className="w-3.5 h-3.5" /> {rec.estimatedSavings}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!analysis && !rcMutation.isPending && (
        <EmptyState
          icon={Brain}
          title="Discover hidden patterns"
          description="Run root cause analysis to find systemic issues, recurring patterns, and actionable insights across your claims portfolio."
        />
      )}
    </div>
  );
}
