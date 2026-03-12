'use client';

import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import {
  CreditCard, Crown, Zap, ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    key: 'starter',
    price: '$79 – $129',
    period: '/month',
    perClaim: '$2.50 – $4 per claim',
    users: '1 user',
    features: ['AI claim generation', 'Document processing', 'Basic carrier communication'],
    color: 'border-slate-200 dark:border-slate-700',
  },
  {
    name: 'Team',
    key: 'team',
    price: '$199 – $349',
    period: '/month',
    perClaim: '$2 – $3 per claim',
    users: '5 users',
    features: ['Shared claim dashboard', 'Automation rules', 'Reporting', 'Extra seats $10–$15/user'],
    color: 'border-blue-200 dark:border-blue-800',
    popular: true,
  },
  {
    name: 'Pro / Growth',
    key: 'pro',
    price: '$499 – $799',
    period: '/month',
    perClaim: '$1 – $2 per claim',
    users: '15–25 users',
    features: ['Advanced AI automation', 'Bulk claim ingestion', 'Analytics dashboard', 'Integrations'],
    color: 'border-purple-200 dark:border-purple-800',
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    price: '$1,500 – $4,000',
    period: '/month',
    perClaim: '$0.50 – $1.50 per claim',
    users: 'Unlimited users',
    features: ['API access', 'TMS integrations', 'Priority AI processing', 'SLA support', 'Custom workflows'],
    color: 'border-amber-200 dark:border-amber-800',
  },
  {
    name: 'White-Label',
    key: 'white_label',
    price: '$5,000 – $20,000+',
    period: '/year',
    perClaim: 'Negotiated volume license',
    users: 'Unlimited',
    features: ['Custom AI training', 'White-label product', 'Private cloud deployment', 'Unlimited claims', 'Dedicated infrastructure'],
    color: 'border-emerald-200 dark:border-emerald-800',
  },
];

export default function AdminBillingPage() {
  const { user } = useAuth();

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Super Admin Access Required</h2>
          <p className="text-slate-500 mt-2">This page is only accessible to platform administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-amber-500" />
          Billing & Plans
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage subscription plans and billing. Stripe integration coming soon.</p>
      </div>

      {/* Stripe Integration Notice */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Stripe Integration Coming Soon</h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mt-1">
              Automated billing, plan upgrades, and usage-based pricing will be available once Stripe is connected.
              For now, plans are managed manually.
            </p>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map(plan => (
          <div key={plan.key} className={`relative bg-white dark:bg-slate-800 rounded-xl border-2 ${plan.color} p-6 ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                Most Popular
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
              <span className="text-sm text-slate-500">{plan.period}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{plan.perClaim}</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-3">{plan.users}</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => toast.info(`Plan management for ${plan.name} will be available once Stripe is connected`)} className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Manage
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
