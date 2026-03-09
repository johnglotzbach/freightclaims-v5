'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get } from '@/lib/api-client';
import {
  CreditCard, CheckCircle2, ArrowRight, XCircle,
  Users, FileText, Brain, BarChart3, AlertTriangle,
  CalendarDays, Info,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UsageData {
  claimsUsed: number;
  claimsLimit: number;
  documentsUsed: number;
  documentsLimit: number;
  aiRequestsUsed: number;
  aiRequestsLimit: number;
  usersUsed: number;
  usersLimit: number;
}

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 99,
    users: 1,
    claims: 50,
    docs: 100,
    aiRequests: 200,
    features: [
      'AI claim entry',
      'Document processing',
      'Basic carrier communication',
      'Email templates',
    ],
    advancedFeatures: {
      sharedDashboard: false,
      automationRules: false,
      reporting: false,
      bulkUpload: false,
      advancedAI: false,
      customDashboards: false,
      apiAccess: false,
      integrations: false,
      priorityAI: false,
      dedicatedInfra: false,
      sla: false,
      sso: false,
      customWorkflows: false,
      whiteLabel: false,
    },
  },
  {
    key: 'team',
    name: 'Team',
    price: 249,
    users: 5,
    claims: 200,
    docs: 500,
    aiRequests: 1000,
    popular: true,
    features: [
      'Everything in Starter',
      'Shared dashboard',
      'Automation rules',
      'Reporting & analytics',
      'Bulk upload',
    ],
    advancedFeatures: {
      sharedDashboard: true,
      automationRules: true,
      reporting: true,
      bulkUpload: true,
      advancedAI: false,
      customDashboards: false,
      apiAccess: false,
      integrations: false,
      priorityAI: false,
      dedicatedInfra: false,
      sla: false,
      sso: false,
      customWorkflows: false,
      whiteLabel: false,
    },
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 599,
    users: 20,
    claims: 1000,
    docs: 2500,
    aiRequests: 5000,
    features: [
      'Everything in Team',
      'Advanced AI automation',
      'Custom dashboards',
      'API access & integrations',
      'Priority AI processing',
    ],
    advancedFeatures: {
      sharedDashboard: true,
      automationRules: true,
      reporting: true,
      bulkUpload: true,
      advancedAI: true,
      customDashboards: true,
      apiAccess: true,
      integrations: true,
      priorityAI: true,
      dedicatedInfra: false,
      sla: false,
      sso: false,
      customWorkflows: false,
      whiteLabel: false,
    },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: null,
    users: -1,
    claims: -1,
    docs: -1,
    aiRequests: -1,
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'SLA & priority support',
      'SSO / SAML',
      'Custom workflows',
      'White-label option',
    ],
    advancedFeatures: {
      sharedDashboard: true,
      automationRules: true,
      reporting: true,
      bulkUpload: true,
      advancedAI: true,
      customDashboards: true,
      apiAccess: true,
      integrations: true,
      priorityAI: true,
      dedicatedInfra: true,
      sla: true,
      sso: true,
      customWorkflows: true,
      whiteLabel: true,
    },
  },
];

const OVERAGE_RATES: Record<string, { claim: number; doc: number; ai: number }> = {
  starter: { claim: 3, doc: 0.10, ai: 0.05 },
  team: { claim: 2, doc: 0.08, ai: 0.03 },
  pro: { claim: 1.5, doc: 0.05, ai: 0.02 },
};

const COMPARISON_ROWS = [
  { label: 'Users', key: 'users' as const },
  { label: 'Claims / month', key: 'claims' as const },
  { label: 'Documents / month', key: 'docs' as const },
  { label: 'AI Requests / month', key: 'aiRequests' as const },
  { label: 'Shared Dashboard', key: 'sharedDashboard' as const },
  { label: 'Automation Rules', key: 'automationRules' as const },
  { label: 'Reporting', key: 'reporting' as const },
  { label: 'Bulk Upload', key: 'bulkUpload' as const },
  { label: 'Advanced AI', key: 'advancedAI' as const },
  { label: 'Custom Dashboards', key: 'customDashboards' as const },
  { label: 'API Access', key: 'apiAccess' as const },
  { label: 'Integrations', key: 'integrations' as const },
  { label: 'Priority AI', key: 'priorityAI' as const },
  { label: 'Dedicated Infrastructure', key: 'dedicatedInfra' as const },
  { label: 'SLA Support', key: 'sla' as const },
  { label: 'SSO / SAML', key: 'sso' as const },
  { label: 'Custom Workflows', key: 'customWorkflows' as const },
  { label: 'White-Label', key: 'whiteLabel' as const },
];

function getBarColor(used: number, limit: number) {
  if (limit <= 0) return 'bg-emerald-500';
  const pct = (used / limit) * 100;
  if (pct > 100) return 'bg-red-500';
  if (pct >= 75) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getBarBg(used: number, limit: number) {
  if (limit <= 0) return 'bg-emerald-100 dark:bg-emerald-500/10';
  const pct = (used / limit) * 100;
  if (pct > 100) return 'bg-red-100 dark:bg-red-500/10';
  if (pct >= 75) return 'bg-amber-100 dark:bg-amber-500/10';
  return 'bg-emerald-100 dark:bg-emerald-500/10';
}

export default function WorkspaceBillingPage() {
  const { user } = useAuth();

  const { data: usageResponse, isLoading } = useQuery({
    queryKey: ['workspace-usage'],
    queryFn: () => get<{ data: UsageData }>('/usage/current'),
  });

  const usage = usageResponse?.data;

  const currentPlanKey = 'starter';
  const currentPlan = PLANS.find((p) => p.key === currentPlanKey) ?? PLANS[0];
  const overageRates = OVERAGE_RATES[currentPlanKey];

  const claimsUsed = usage?.claimsUsed ?? 0;
  const claimsLimit = usage?.claimsLimit ?? currentPlan.claims;
  const docsUsed = usage?.documentsUsed ?? 0;
  const docsLimit = usage?.documentsLimit ?? currentPlan.docs;
  const aiUsed = usage?.aiRequestsUsed ?? 0;
  const aiLimit = usage?.aiRequestsLimit ?? currentPlan.aiRequests;
  const usersUsed = usage?.usersUsed ?? 1;
  const usersLimit = usage?.usersLimit ?? currentPlan.users;

  const overages = [];
  if (claimsUsed > claimsLimit && overageRates) {
    overages.push({
      label: 'Claims overage',
      extra: claimsUsed - claimsLimit,
      rate: overageRates.claim,
      total: (claimsUsed - claimsLimit) * overageRates.claim,
    });
  }
  if (docsUsed > docsLimit && overageRates) {
    overages.push({
      label: 'Document overage',
      extra: docsUsed - docsLimit,
      rate: overageRates.doc,
      total: (docsUsed - docsLimit) * overageRates.doc,
    });
  }
  if (aiUsed > aiLimit && overageRates) {
    overages.push({
      label: 'AI request overage',
      extra: aiUsed - aiLimit,
      rate: overageRates.ai,
      total: (aiUsed - aiLimit) * overageRates.ai,
    });
  }

  const usageBars = [
    { label: 'Claims', used: claimsUsed, limit: claimsLimit, icon: FileText },
    { label: 'Documents', used: docsUsed, limit: docsLimit, icon: BarChart3 },
    { label: 'AI Requests', used: aiUsed, limit: aiLimit, icon: Brain },
    { label: 'Users', used: usersUsed, limit: usersLimit, icon: Users },
  ];

  const renewalDate = new Date();
  renewalDate.setMonth(renewalDate.getMonth() + 1);
  renewalDate.setDate(1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-emerald-500" />
          Team Billing
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage your team plan, usage, and billing</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Plan</h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400 capitalize">
                {currentPlan.name}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                Active
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {currentPlan.users === -1 ? 'Unlimited' : currentPlan.users} user{currentPlan.users !== 1 ? 's' : ''} included
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Renews {renewalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {currentPlan.price !== null ? `$${currentPlan.price}` : 'Custom'}
            </p>
            <p className="text-sm text-slate-500">/month</p>
          </div>
        </div>
      </div>

      {/* Usage Progress Bars */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-5">Current Period Usage</h3>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {usageBars.map((bar) => {
              const pct = bar.limit > 0 ? Math.min((bar.used / bar.limit) * 100, 100) : 0;
              const overPct = bar.limit > 0 ? (bar.used / bar.limit) * 100 : 0;
              const isOver = overPct > 100;

              return (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <bar.icon className="w-4 h-4 text-slate-400" />
                      {bar.label}
                    </span>
                    <span className={cn(
                      'text-sm font-semibold',
                      isOver ? 'text-red-500' : overPct >= 75 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400',
                    )}>
                      {bar.used.toLocaleString()} / {bar.limit.toLocaleString()}
                      {isOver && (
                        <span className="ml-1.5 text-xs font-bold text-red-500">
                          (+{(bar.used - bar.limit).toLocaleString()} over)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={cn('w-full h-2.5 rounded-full overflow-hidden', getBarBg(bar.used, bar.limit))}>
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', getBarColor(bar.used, bar.limit))}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overage Section */}
      {overages.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-200 dark:border-red-500/20 p-6">
          <h3 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Overage Charges This Period
          </h3>
          <div className="space-y-2">
            {overages.map((o) => (
              <div key={o.label} className="flex items-center justify-between text-sm">
                <span className="text-red-600 dark:text-red-400">
                  {o.label}: {o.extra.toLocaleString()} extra x ${o.rate.toFixed(2)}
                </span>
                <span className="font-bold text-red-700 dark:text-red-300">${o.total.toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-red-200 dark:border-red-500/20 flex items-center justify-between">
              <span className="font-semibold text-red-700 dark:text-red-300">Total Overage</span>
              <span className="text-lg font-extrabold text-red-700 dark:text-red-300">
                ${overages.reduce((s, o) => s + o.total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subscription */}
      <div className="flex items-center gap-3">
        <div className="group relative">
          <button
            disabled
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-xl font-semibold text-sm cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" />
            Manage Subscription
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            <Info className="w-3 h-3 inline mr-1" />
            Stripe integration coming soon
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45" />
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          Contact Sales to Upgrade
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Plan Comparison */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Compare Plans</h3>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.key}
                      className={cn(
                        'text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider',
                        p.key === currentPlanKey
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/5'
                          : 'text-slate-500',
                      )}
                    >
                      {p.name}
                      {p.key === currentPlanKey && (
                        <span className="block text-[9px] text-primary-500 font-bold mt-0.5">CURRENT</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                <tr>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium">Price</td>
                  {PLANS.map((p) => (
                    <td key={p.key} className={cn(
                      'text-center px-3 py-2.5 font-bold text-slate-900 dark:text-white',
                      p.key === currentPlanKey && 'bg-primary-50/30 dark:bg-primary-500/5',
                    )}>
                      {p.price !== null ? `$${p.price}/mo` : 'Custom'}
                    </td>
                  ))}
                </tr>
                {COMPARISON_ROWS.map((row) => {
                  const isNumeric = ['users', 'claims', 'docs', 'aiRequests'].includes(row.key);
                  return (
                    <tr key={row.key}>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{row.label}</td>
                      {PLANS.map((p) => {
                        if (isNumeric) {
                          const val = p[row.key as 'users' | 'claims' | 'docs' | 'aiRequests'];
                          return (
                            <td key={p.key} className={cn(
                              'text-center px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium',
                              p.key === currentPlanKey && 'bg-primary-50/30 dark:bg-primary-500/5',
                            )}>
                              {val === -1 ? 'Unlimited' : val.toLocaleString()}
                            </td>
                          );
                        }
                        const has = p.advancedFeatures[row.key as keyof typeof p.advancedFeatures];
                        return (
                          <td key={p.key} className={cn(
                            'text-center px-3 py-2.5',
                            p.key === currentPlanKey && 'bg-primary-50/30 dark:bg-primary-500/5',
                          )}>
                            {has ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
