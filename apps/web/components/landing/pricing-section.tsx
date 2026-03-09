'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const tiers = [
  {
    name: 'Starter',
    monthly: 99,
    badge: null,
    users: '1 user',
    limits: '50 claims/mo · 100 docs/mo · 200 AI requests/mo',
    features: [
      'AI claim entry',
      'Document processing',
      'Basic carrier communication',
      'Email templates',
    ],
    overage: '$3/claim · $0.10/doc · $0.05/AI request',
    extraSeats: null,
    cta: 'Get Started',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Team',
    monthly: 249,
    badge: 'Most Popular',
    users: '5 users',
    limits: '200 claims/mo · 500 docs/mo · 1,000 AI requests/mo',
    features: [
      'Everything in Starter',
      'Shared dashboard',
      'Automation rules',
      'Reporting & analytics',
      'Bulk upload',
    ],
    overage: '$2/claim · $0.08/doc · $0.03/AI request',
    extraSeats: '$15/user/mo',
    cta: 'Start Free Trial',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Pro',
    monthly: 599,
    badge: null,
    users: '20 users',
    limits: '1,000 claims/mo · 2,500 docs/mo · 5,000 AI requests/mo',
    features: [
      'Everything in Team',
      'Advanced AI automation',
      'Custom dashboards',
      'API access & integrations',
      'Priority AI processing',
    ],
    overage: null,
    extraSeats: '$10/user/mo',
    cta: 'Start Free Trial',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Enterprise',
    monthly: null,
    badge: null,
    users: 'Unlimited users',
    limits: 'Unlimited claims',
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'SLA & priority support',
      'SSO / SAML',
      'Custom workflows',
      'White-label option',
    ],
    overage: null,
    extraSeats: null,
    cta: 'Contact Sales',
    href: '/contact',
    highlight: false,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  function price(monthly: number | null) {
    if (monthly === null) return null;
    if (annual) return Math.round(monthly * 0.8);
    return monthly;
  }

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-sm font-semibold text-primary-500 uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">
            Start free for 14 days. No credit card required. Scale as your team grows.
          </p>
        </div>

        {/* Monthly / Annual Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className={`text-sm font-medium ${
              !annual
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
              annual
                ? 'bg-primary-500'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                annual ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              annual
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Annual
          </span>
          {annual && (
            <span className="ml-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => {
            const p = price(tier.monthly);
            const isHighlight = tier.highlight;

            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl flex flex-col transition-all duration-300 ${
                  isHighlight
                    ? 'bg-primary-50 dark:bg-primary-950 border-2 border-primary-500 shadow-xl shadow-primary-500/10 ring-1 ring-primary-300 dark:ring-primary-700 scale-[1.02] lg:scale-105 z-10'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg'
                } p-6`}
              >
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    {tier.badge}
                  </div>
                )}

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {tier.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tier.users}
                </p>

                <div className="mt-4 mb-1">
                  {p !== null ? (
                    <>
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        ${p}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        /mo
                      </span>
                      {annual && (
                        <span className="block text-xs text-slate-400 mt-0.5">
                          billed annually (${p * 12}/yr)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      Custom
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-5">
                  {tier.limits}
                </p>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {(tier.extraSeats || tier.overage) && (
                  <div className="mb-5 space-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {tier.extraSeats && (
                      <p>Extra seats: {tier.extraSeats}</p>
                    )}
                    {tier.overage && <p>Overage: {tier.overage}</p>}
                  </div>
                )}

                <Link
                  href={tier.href}
                  className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isHighlight
                      ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/20'
                      : tier.name === 'Enterprise'
                        ? 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
