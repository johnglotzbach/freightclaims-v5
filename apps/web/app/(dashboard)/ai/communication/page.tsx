'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/loading';
import {
  MessageSquare, Send, Sparkles, Clock, AlertTriangle, ChevronRight,
  Mail, CalendarClock, Copy, Check, CheckCircle, XCircle,
} from 'lucide-react';

interface CommunicationPlan {
  immediateActions: Array<{ action: string; template: string; recipient: string; priority: string }>;
  scheduledFollowUps: Array<{ action: string; scheduledDays: number; condition: string }>;
  deadlines: Array<{ type: string; date: string; daysRemaining: number; urgency: string }>;
  draftEmail: { subject: string; body: string; to: string };
}

function urgencyStyle(urgency: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  };
  return map[urgency] || map.normal;
}

function priorityDot(priority: string) {
  const map: Record<string, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };
  return map[priority] || map.medium;
}

export default function CarrierCommunicationPage() {
  const [claimId, setClaimId] = useState('');
  const [actionType, setActionType] = useState('auto');
  const [result, setResult] = useState<CommunicationPlan | null>(null);
  const [copied, setCopied] = useState(false);

  const commMutation = useMutation({
    mutationFn: (data: any) => post<any>('/ai/agents/communication', data),
    onSuccess: (data) => {
      setResult(data.structuredOutput?.plan || data.result);
    },
  });

  const handleGenerate = () => {
    if (!claimId.trim()) return;
    commMutation.mutate({ claimId: claimId.trim(), actionType });
  };

  const copyEmail = () => {
    if (!result?.draftEmail) return;
    const text = `Subject: ${result.draftEmail.subject}\nTo: ${result.draftEmail.to}\n\n${result.draftEmail.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary-500" /> Carrier Communication
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          AI-powered communication planning with automated follow-up scheduling, deadline tracking, and email drafting.
        </p>
      </div>

      {/* Input */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Claim ID</label>
            <input
              type="text"
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Enter claim ID..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Action Type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="auto">Auto-detect best action</option>
              <option value="initial_filing">Initial filing letter</option>
              <option value="follow_up">Follow-up</option>
              <option value="acknowledgment_request">Request acknowledgment</option>
              <option value="escalation">Escalation notice</option>
              <option value="settlement_inquiry">Settlement inquiry</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={commMutation.isPending || !claimId.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {commMutation.isPending ? (
            <><Sparkles className="w-4 h-4 animate-spin" /> Planning...</>
          ) : (
            <><Send className="w-4 h-4" /> Generate Plan</>
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Deadlines */}
          {result.deadlines?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary-500" /> Compliance Deadlines
              </h3>
              <div className="space-y-2">
                {result.deadlines.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      {d.urgency === 'critical' ? <XCircle className="w-4 h-4 text-red-500" /> :
                       d.urgency === 'urgent' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                       <Clock className="w-4 h-4 text-blue-500" />}
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.type.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-slate-400">{new Date(d.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', urgencyStyle(d.urgency))}>
                        {d.daysRemaining > 0 ? `${d.daysRemaining} days left` : `${Math.abs(d.daysRemaining)} days overdue`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Immediate Actions */}
          {result.immediateActions?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-500" /> Immediate Actions
              </h3>
              <div className="space-y-2">
                {result.immediateActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', priorityDot(action.priority))} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.action}</div>
                      <div className="text-xs text-slate-400 mt-0.5">To: {action.recipient} — {action.template}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Follow-ups */}
          {result.scheduledFollowUps?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary-500" /> Scheduled Follow-ups
              </h3>
              <div className="space-y-2">
                {result.scheduledFollowUps.map((fu, i) => (
                  <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{fu.action}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Condition: {fu.condition}</div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-primary-500 whitespace-nowrap">
                      Day {fu.scheduledDays}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Email */}
          {result.draftEmail && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary-500" /> Draft Email
                </h3>
                <button onClick={copyEmail} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                <div className="text-xs text-slate-400">To: <span className="text-slate-600 dark:text-slate-300">{result.draftEmail.to}</span></div>
                <div className="text-xs text-slate-400">Subject: <span className="text-slate-600 dark:text-slate-300 font-medium">{result.draftEmail.subject}</span></div>
                <hr className="border-slate-200 dark:border-slate-700" />
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {result.draftEmail.body}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !commMutation.isPending && (
        <EmptyState
          icon={MessageSquare}
          title="Plan carrier communications"
          description="Enter a claim ID to generate a communication plan with automated follow-ups, deadline tracking, and draft emails."
        />
      )}
    </div>
  );
}
