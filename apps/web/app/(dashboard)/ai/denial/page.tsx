'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/loading';
import {
  Gavel, FileText, Sparkles, ChevronRight, CheckCircle, XCircle,
  AlertTriangle, Mail, Copy, Check, BookOpen,
} from 'lucide-react';

interface DenialAnalysis {
  denialReasons: string[];
  rebuttableReasons: Array<{ reason: string; rebuttalBasis: string; strength: string }>;
  legalGrounds: string[];
  appealRecommendation: string;
  appealSuccessProbability: number;
  suggestedActions: string[];
}

interface DenialResult {
  analysis: DenialAnalysis;
  rebuttalLetter: string;
  emailSuggestion: string;
}

function strengthColor(strength: string) {
  const map: Record<string, string> = {
    strong: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
    moderate: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
    weak: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
  };
  return map[strength] || map.moderate;
}

function appealRecColor(rec: string) {
  if (rec.includes('strongly')) return 'text-emerald-600 dark:text-emerald-400';
  if (rec === 'recommend') return 'text-blue-600 dark:text-blue-400';
  if (rec === 'consider') return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function DenialResponsePage() {
  const [claimId, setClaimId] = useState('');
  const [denialText, setDenialText] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [result, setResult] = useState<DenialResult | null>(null);
  const [copied, setCopied] = useState<'letter' | 'email' | null>(null);

  const denialMutation = useMutation({
    mutationFn: (data: any) => post<any>('/ai/agents/denial', data),
    onSuccess: (data) => {
      const output = data.structuredOutput || data.result;
      setResult(output);
    },
  });

  const handleGenerate = () => {
    if (!claimId.trim() && !denialText.trim()) return;
    denialMutation.mutate({
      claimId: claimId.trim() || undefined,
      denialText: denialText.trim(),
      carrierName: carrierName.trim() || undefined,
    });
  };

  const copyToClipboard = (text: string, type: 'letter' | 'email') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Gavel className="w-6 h-6 text-primary-500" /> Denial Response Generator
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          AI-powered appeal drafting that analyzes denial reasons, identifies Carmack Amendment grounds, and writes professional rebuttal letters.
        </p>
      </div>

      {/* Input Form */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Claim ID</label>
            <input
              type="text"
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              placeholder="Enter the denied claim ID..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Carrier Name</label>
            <input
              type="text"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="e.g., Southeastern Freight Lines"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Denial Letter / Reason</label>
          <textarea
            value={denialText}
            onChange={(e) => setDenialText(e.target.value)}
            placeholder="Paste the carrier's denial letter or describe the denial reason here..."
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={denialMutation.isPending || (!claimId.trim() && !denialText.trim())}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {denialMutation.isPending ? (
            <><Sparkles className="w-4 h-4 animate-spin" /> Generating Response...</>
          ) : (
            <><Gavel className="w-4 h-4" /> Generate Appeal</>
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Appeal Recommendation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">Appeal Recommendation</div>
              <div className={cn('text-lg font-bold capitalize', appealRecColor(result.analysis.appealRecommendation))}>
                {result.analysis.appealRecommendation.replace(/_/g, ' ')}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">Success Probability</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {Math.round(result.analysis.appealSuccessProbability * 100)}%
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${result.analysis.appealSuccessProbability * 100}%` }}
                />
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">Rebuttable Reasons</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {result.analysis.rebuttableReasons.length} of {result.analysis.denialReasons.length}
              </div>
            </div>
          </div>

          {/* Denial Reasons & Rebuttals */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-500" /> Denial Analysis
            </h3>
            <div className="space-y-3">
              {result.analysis.rebuttableReasons.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.reason}</span>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap', strengthColor(item.strength))}>
                      {item.strength}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{item.rebuttalBasis}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Grounds */}
          {result.analysis.legalGrounds?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-primary-500" /> Legal Grounds
              </h3>
              <ul className="space-y-1.5">
                {result.analysis.legalGrounds.map((ground, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {ground}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rebuttal Letter */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-500" /> Generated Rebuttal Letter
              </h3>
              <button
                onClick={() => copyToClipboard(result.rebuttalLetter, 'letter')}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
              >
                {copied === 'letter' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'letter' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
              {result.rebuttalLetter}
            </div>
          </div>

          {/* Email Draft */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-500" /> Email Draft
              </h3>
              <button
                onClick={() => copyToClipboard(result.emailSuggestion, 'email')}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
              >
                {copied === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'email' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {result.emailSuggestion}
            </div>
          </div>

          {/* Actions */}
          {result.analysis.suggestedActions?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Next Steps</h3>
              <ul className="space-y-2">
                {result.analysis.suggestedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <ChevronRight className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!result && !denialMutation.isPending && (
        <EmptyState
          icon={Gavel}
          title="Generate appeal responses"
          description="Enter a claim ID or paste a carrier denial letter to generate an AI-powered rebuttal citing Carmack Amendment provisions."
        />
      )}
    </div>
  );
}
