'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/loading';
import {
  ShieldAlert, Search, AlertTriangle, CheckCircle, XCircle,
  AlertOctagon, Eye, Sparkles, BarChart3, Copy, ChevronRight,
} from 'lucide-react';

interface FraudFlag {
  type: string;
  severity: string;
  description: string;
  evidence: string;
}

interface FraudAnalysis {
  riskLevel: string;
  overallScore: number;
  flags: FraudFlag[];
  duplicateCheck: { hasPotentialDuplicates: boolean; matches: Array<{ claimNumber: string; matchScore: number }> };
  amountAnalysis: { isOutlier: boolean; percentile: number; detail: string };
  timingAnalysis: { isSuspicious: boolean; detail: string };
  recommendations: string[];
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

function riskLevelStyle(level: string) {
  const map: Record<string, { bg: string; text: string; icon: any }> = {
    low: { bg: 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle },
    medium: { bg: 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20', text: 'text-amber-700 dark:text-amber-400', icon: AlertTriangle },
    high: { bg: 'bg-orange-50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/20', text: 'text-orange-700 dark:text-orange-400', icon: AlertOctagon },
    critical: { bg: 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20', text: 'text-red-700 dark:text-red-400', icon: XCircle },
  };
  return map[level] || map.medium;
}

export default function FraudDetectionPage() {
  const [claimId, setClaimId] = useState('');
  const [result, setResult] = useState<{ analysis: FraudAnalysis; stats: any } | null>(null);

  const fraudMutation = useMutation({
    mutationFn: (data: { claimId: string }) => post<any>('/ai/agents/fraud', data),
    onSuccess: (data) => {
      setResult(data.structuredOutput);
    },
  });

  const handleCheck = () => {
    if (!claimId.trim()) return;
    fraudMutation.mutate({ claimId: claimId.trim() });
  };

  const analysis = result?.analysis;
  const riskStyle = analysis ? riskLevelStyle(analysis.riskLevel) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary-500" /> Fraud & Anomaly Detection
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          AI-powered analysis that checks claims for duplicates, amount anomalies, suspicious timing, and known fraud patterns.
        </p>
      </div>

      {/* Input */}
      <div className="card p-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Claim ID</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            placeholder="Enter claim ID to analyze for fraud..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <button
            onClick={handleCheck}
            disabled={fraudMutation.isPending || !claimId.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {fraudMutation.isPending ? (
              <><Sparkles className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><Eye className="w-4 h-4" /> Run Fraud Check</>
            )}
          </button>
        </div>
      </div>

      {analysis && riskStyle && (
        <div className="space-y-4">
          {/* Risk Level Banner */}
          <div className={cn('card p-5 border', riskStyle.bg)}>
            <div className="flex items-center gap-3">
              <riskStyle.icon className={cn('w-8 h-8', riskStyle.text)} />
              <div>
                <div className={cn('text-lg font-bold uppercase', riskStyle.text)}>
                  {analysis.riskLevel} Risk
                </div>
                <div className="text-sm text-slate-500">
                  Fraud score: {analysis.overallScore}/100 — {analysis.flags.length} flag(s) detected
                </div>
              </div>
            </div>
          </div>

          {/* Checks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Copy className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Duplicate Check</span>
              </div>
              {analysis.duplicateCheck.hasPotentialDuplicates ? (
                <div className="text-red-600 dark:text-red-400 text-sm font-medium">
                  {analysis.duplicateCheck.matches.length} potential duplicate(s)
                  <div className="mt-1 space-y-1">
                    {analysis.duplicateCheck.matches.map((m, i) => (
                      <div key={i} className="text-xs text-slate-500">
                        {m.claimNumber} ({Math.round(m.matchScore * 100)}% match)
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> No duplicates found
                </div>
              )}
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Analysis</span>
              </div>
              <div className={cn('text-sm font-medium', analysis.amountAnalysis.isOutlier ? 'text-amber-600' : 'text-emerald-600')}>
                {analysis.amountAnalysis.isOutlier ? 'Outlier Detected' : 'Within Normal Range'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {Math.round(analysis.amountAnalysis.percentile * 100)}th percentile — {analysis.amountAnalysis.detail}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Timing Analysis</span>
              </div>
              <div className={cn('text-sm font-medium', analysis.timingAnalysis.isSuspicious ? 'text-amber-600' : 'text-emerald-600')}>
                {analysis.timingAnalysis.isSuspicious ? 'Suspicious Timing' : 'Normal Timing'}
              </div>
              <div className="text-xs text-slate-400 mt-1">{analysis.timingAnalysis.detail}</div>
            </div>
          </div>

          {/* Flags */}
          {analysis.flags.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Detected Flags</h3>
              <div className="space-y-3">
                {analysis.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap', severityColor(flag.severity))}>
                      {flag.severity}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{flag.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{flag.type} — {flag.evidence}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Recommended Actions</h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
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

      {!analysis && !fraudMutation.isPending && (
        <EmptyState
          icon={ShieldAlert}
          title="Check any claim for fraud"
          description="Enter a claim ID to run AI-powered anomaly detection, duplicate checking, and pattern analysis."
        />
      )}
    </div>
  );
}
