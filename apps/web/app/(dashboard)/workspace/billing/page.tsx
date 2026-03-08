'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  CreditCard, Zap, CheckCircle2, ArrowRight,
  Users, FileText, Brain, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$79 – $129',
    period: '/month',
    perClaim: '$2.50 – $4',
    users: 1,
    features: ['1 user', 'AI claim generation', 'Document processing', 'Basic carrier communication'],
  },
  {
    key: 'team',
    name: 'Team',
    price: '$199 – $349',
    period: '/month',
    perClaim: '$2 – $3',
    users: 5,
    features: ['5 users', 'Shared claim dashboard', 'Automation rules', 'Reporting'],
    popular: true,
  },
  {
    key: 'pro',
    name: 'Pro / Growth',
    price: '$499 – $799',
    period: '/month',
    perClaim: '$1 – $2',
    users: 25,
    features: ['15–25 users', 'Advanced AI automation', 'Bulk claim ingestion', 'Analytics', 'Integrations'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '$1,500 – $4,000',
    period: '/month',
    perClaim: '$0.50 – $1.50',
    users: -1,
    features: ['Unlimited users', 'API access', 'TMS integrations', 'Priority AI', 'SLA support', 'Custom workflows'],
  },
];

export default function WorkspaceBillingPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-emerald-500" />
          Billing & Subscription
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage your workspace plan and billing</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Current Plan</h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">Starter</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Active</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">1 user included · $2.50 – $4 per claim</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">$79</p>
            <p className="text-sm text-slate-500">/month</p>
          </div>
        </div>
      </div>

      {/* Stripe CTA */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950 dark:to-accent-950 rounded-xl border border-primary-200 dark:border-primary-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm flex-shrink-0">
            <Zap className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Stripe Integration Coming Soon</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Self-service plan upgrades, automatic billing, usage tracking, and invoicing will be available
              once Stripe is connected. Contact support to change your plan in the meantime.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map(plan => (
            <div key={plan.key} className={`bg-white dark:bg-slate-800 rounded-xl border ${plan.popular ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-200 dark:ring-primary-800' : 'border-slate-200 dark:border-slate-700'} p-5 relative`}>
              {plan.popular && (
                <span className="absolute -top-2.5 left-4 bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Popular</span>
              )}
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="text-xs text-slate-500">{plan.period}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">{plan.perClaim} per claim</p>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Current Usage</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Team Members', value: '1 / 1', icon: Users },
            { label: 'Claims This Month', value: '0', icon: FileText },
            { label: 'AI Requests', value: '0', icon: Brain },
            { label: 'Reports Generated', value: '0', icon: BarChart3 },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <stat.icon className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
