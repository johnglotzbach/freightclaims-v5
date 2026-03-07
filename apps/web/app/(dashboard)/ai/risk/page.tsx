'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { get, post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/loading';
import {
  Shield, Search, TrendingDown, TrendingUp, Minus, AlertTriangle,
  CheckCircle, XCircle, ChevronRight, BarChart3, Clock, DollarSign,
  Sparkles, Truck,
} from 'lucide-react';

interface RiskAssessment {
  overallScore: number;
  grade: string;
  factors: Record<string, { score: number; detail: string }>;
  trends: Array<{ metric: string; direction: string; detail: string }>;
  recommendations: string[];
  riskFlags: string[];
}

interface RiskResult {
  assessment: RiskAssessment;
  stats: { carrierName: string; scacCode: string; totalClaims: number; approvalRate: number; denialRate: number; avgClaimAmount: number; avgResolutionDays: number | null; avgPaymentDelay: number | null };
  carrier: { id: string; name: string; scacCode: string };
}

function gradeColor(grade: string) {
  const colors: Record<string, string> = {
    A: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
    B: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
    C: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
    D: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400',
    F: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
  };
  return colors[grade] || colors.C;
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function CarrierRiskPage() {
  const [carrierScac, setCarrierScac] = useState('');
  const [result, setResult] = useState<RiskResult | null>(null);

  const riskMutation = useMutation({
    mutationFn: (data: { carrierScac: string }) => post<any>('/ai/agents/risk', data),
    onSuccess: (data) => {
      setResult(data.structuredOutput as RiskResult);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'Carrier analysis failed. Check the SCAC code and try again.'),
  });

  const handleAnalyze = () => {
    if (!carrierScac.trim()) return;
    riskMutation.mutate({ carrierScac: carrierScac.trim().toUpperCase() });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-500" /> Carrier Risk Scoring
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          AI-powered carrier reliability analysis based on claims history, payment patterns, and resolution speed.
        </p>
      </div>

      {/* Search */}
      <div className="card p-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Carrier SCAC Code</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={carrierScac}
            onChange={(e) => setCarrierScac(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Enter carrier SCAC code (e.g., SEFL, XPOL, CNWY)..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm uppercase"
            maxLength={6}
          />
          <button
            onClick={handleAnalyze}
            disabled={riskMutation.isPending || !carrierScac.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {riskMutation.isPending ? (
              <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Shield className="w-4 h-4" /> Analyze Carrier</>
            )}
          </button>
        </div>
      </div>

      {riskMutation.isError && (
        <div className="card p-4 border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5">
          <p className="text-sm text-red-600 dark:text-red-400">
            {(riskMutation.error as any)?.response?.data?.error || (riskMutation.error as Error)?.message || 'Carrier analysis failed. Check the SCAC code and try again.'}
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Grade + Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="card p-6 lg:col-span-1 flex flex-col items-center justify-center">
              <div className={cn('text-6xl font-black rounded-2xl w-24 h-24 flex items-center justify-center', gradeColor(result.assessment.grade))}>
                {result.assessment.grade}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{result.assessment.overallScore}/100</div>
              <div className="text-sm text-slate-500 mt-1">{result.carrier.name}</div>
              <div className="text-xs text-slate-400">{result.carrier.scacCode}</div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Total Claims</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{result.stats.totalClaims}</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approval Rate</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{Math.round(result.stats.approvalRate * 100)}%</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Denial Rate</div>
                <div className="text-xl font-bold text-red-600 mt-1">{Math.round(result.stats.denialRate * 100)}%</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Avg Resolution</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{result.stats.avgResolutionDays ?? '—'} days</div>
              </div>
            </div>
          </div>

          {/* Factor Breakdown */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Risk Factor Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(result.assessment.factors).map(([key, factor]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className={cn('text-sm font-bold', factor.score >= 70 ? 'text-emerald-600' : factor.score >= 40 ? 'text-amber-600' : 'text-red-600')}>
                      {factor.score}/100
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', scoreBarColor(factor.score))} style={{ width: `${factor.score}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{factor.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trends + Flags */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.assessment.trends?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Trends</h3>
                <div className="space-y-3">
                  {result.assessment.trends.map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      {t.direction === 'improving' ? <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5" /> :
                       t.direction === 'declining' ? <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" /> :
                       <Minus className="w-4 h-4 text-slate-400 mt-0.5" />}
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.metric}</span>
                        <p className="text-xs text-slate-400">{t.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.assessment.riskFlags?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Risk Flags
                </h3>
                <ul className="space-y-2">
                  {result.assessment.riskFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {result.assessment.recommendations?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {result.assessment.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <ChevronRight className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!result && !riskMutation.isPending && (
        <EmptyState
          icon={Truck}
          title="Analyze any carrier"
          description="Enter a carrier's SCAC code above to generate an AI-powered risk assessment based on historical claims data."
        />
      )}
    </div>
  );
}
