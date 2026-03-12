'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Search, AlertTriangle, CheckCircle, XCircle,
  BarChart3, ArrowRight, Sparkles, Target, Clock, DollarSign,
} from 'lucide-react';

interface Prediction {
  likelyOutcome: string;
  outcomeProbability: number;
  estimatedSettlement: { min: number; max: number; expected: number };
  estimatedResolutionDays: number;
  denialRisk: number;
  keyFactors: Array<{ factor: string; impact: string; weight: number }>;
  recommendations: string[];
}

export default function AIPredictPage() {
  const [claimId, setClaimId] = useState('');
  const [result, setResult] = useState<{ prediction: Prediction; summary: string } | null>(null);

  const predictMutation = useMutation({
    mutationFn: (data: { claimId: string }) => post<any>('/ai/agents/predictor', data),
    onSuccess: (data) => {
      if (data?.status === 'failed') {
        toast.error(data.result || 'Prediction failed. Verify the claim ID and try again.');
        setResult(null);
        return;
      }
      setResult({
        prediction: data.structuredOutput?.prediction || data.result,
        summary: typeof data.result === 'string' ? data.result : data.summary || '',
      });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'AI analysis failed. Make sure you have a valid claim ID.'),
  });

  const handlePredict = () => {
    if (!claimId) return;
    predictMutation.mutate({ claimId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-500" /> AI Claim Outcome Predictor
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Predict claim outcomes, settlement ranges, and resolution timelines using AI analysis of historical patterns.
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
            placeholder="Enter a claim ID to analyze..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <button
            onClick={handlePredict}
            disabled={predictMutation.isPending || !claimId}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {predictMutation.isPending ? (
              <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Target className="w-4 h-4" /> Predict Outcome</>
            )}
          </button>
        </div>
      </div>

      {predictMutation.isError && (
        <div className="card p-4 border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5">
          <p className="text-sm text-red-600 dark:text-red-400">
            {(predictMutation.error as any)?.response?.data?.error || (predictMutation.error as Error)?.message || 'AI analysis failed. Make sure you have a valid claim ID.'}
          </p>
        </div>
      )}

      {/* Results */}
      {result?.prediction && (
        <div className="space-y-4">
          {/* Summary Card */}
          {result.summary && (
            <div className="card p-5 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-500/5 dark:to-blue-500/5 border-primary-200/50 dark:border-primary-500/20">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <Target className="w-4 h-4" /> Likely Outcome
              </div>
              <div className={cn(
                'text-lg font-bold capitalize',
                result.prediction.likelyOutcome.includes('approved') || result.prediction.likelyOutcome.includes('settlement')
                  ? 'text-emerald-600'
                  : result.prediction.likelyOutcome.includes('denied')
                    ? 'text-red-600'
                    : 'text-amber-600'
              )}>
                {result.prediction.likelyOutcome.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-slate-400 mt-1">{Math.round(result.prediction.outcomeProbability * 100)}% confidence</div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <DollarSign className="w-4 h-4" /> Expected Settlement
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                ${result.prediction.estimatedSettlement.expected.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Range: ${result.prediction.estimatedSettlement.min.toLocaleString()} — ${result.prediction.estimatedSettlement.max.toLocaleString()}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <Clock className="w-4 h-4" /> Est. Resolution
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {result.prediction.estimatedResolutionDays} days
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <AlertTriangle className="w-4 h-4" /> Denial Risk
              </div>
              <div className={cn(
                'text-lg font-bold',
                result.prediction.denialRisk > 0.6 ? 'text-red-600'
                  : result.prediction.denialRisk > 0.3 ? 'text-amber-600'
                    : 'text-emerald-600'
              )}>
                {Math.round(result.prediction.denialRisk * 100)}%
              </div>
            </div>
          </div>

          {/* Key Factors */}
          {result.prediction.keyFactors?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Key Factors</h3>
              <div className="space-y-3">
                {result.prediction.keyFactors.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                      f.impact === 'positive' ? 'bg-emerald-100 dark:bg-emerald-500/10' : f.impact === 'negative' ? 'bg-red-100 dark:bg-red-500/10' : 'bg-slate-100 dark:bg-slate-700'
                    )}>
                      {f.impact === 'positive' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> :
                       f.impact === 'negative' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                       <BarChart3 className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{f.factor}</span>
                    </div>
                    <div className="h-2 w-20 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', f.impact === 'positive' ? 'bg-emerald-500' : f.impact === 'negative' ? 'bg-red-500' : 'bg-slate-400')}
                        style={{ width: `${f.weight * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.prediction.recommendations?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {result.prediction.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <ArrowRight className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
