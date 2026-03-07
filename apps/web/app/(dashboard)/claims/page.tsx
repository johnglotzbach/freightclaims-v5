/**
 * Claims Dashboard - Main analytics overview with charts and KPIs
 *
 * Displays key metrics (claims by status, settlement rates, top carriers),
 * interactive charts, and quick action buttons. Fully responsive with
 * cards that stack on mobile and grid on desktop.
 *
 * Location: apps/web/app/(dashboard)/claims/page.tsx
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  FileText, Clock, CheckCircle,
  AlertTriangle, DollarSign, Plus, Bot, ArrowRight,
} from 'lucide-react';

const DashboardCharts = dynamic(() => import('@/components/dashboard/dashboard-charts'), { ssr: false });

interface DashboardData {
  stats: { label: string; value: number; change?: number }[];
  claimsByStatus: { name: string; count: number }[];
  claimsByType: { name: string; count: number }[];
  monthlyTrend: { month: string; filed: number; settled: number; amount: number }[];
  topCarriers: { name: string; claims: number; avgSettlement: number }[];
  recentClaims: { id: string; claimNumber: string; title: string; status: string; amount: number; createdAt: string }[];
  complianceAlerts?: string[];
}

const PLACEHOLDER: DashboardData = {
  stats: [
    { label: 'Total Claims', value: 0 },
    { label: 'Pending Review', value: 0 },
    { label: 'Settlement Rate', value: 0 },
    { label: 'Avg Settlement', value: 0 },
  ],
  claimsByStatus: [],
  claimsByType: [],
  monthlyTrend: [],
  topCarriers: [],
  recentClaims: [],
};

export default function ClaimsDashboard() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => get<DashboardData>('/reports/dashboard'),
    placeholderData: PLACEHOLDER,
  });

  const stats = data?.stats || PLACEHOLDER.stats;
  const statIcons = [FileText, Clock, CheckCircle, DollarSign];
  const companyName = (user as any)?.corporateName;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {companyName ? `${companyName} — Dashboard` : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your claims portfolio</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/claims/new"
            className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Claim</span>
          </Link>
          <Link
            href="/ai"
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat, i) => {
          const Icon = statIcons[i] || FileText;
          const isPositive = (stat.change || 0) > 0;
          const hasChange = stat.change !== undefined && stat.change !== 0;
          return (
            <div key={stat.label} className="card p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="p-2 bg-primary-50 dark:bg-primary-950 rounded-xl">
                  <Icon className="w-5 h-5 text-primary-500" />
                </div>
                {hasChange && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'}`}>
                    {isPositive ? '+' : ''}{stat.change}%
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                {stat.label.includes('Avg') ? `$${stat.value.toLocaleString()}` :
                 stat.label.includes('Rate') ? `${stat.value}%` :
                 stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <DashboardCharts data={data || PLACEHOLDER} />

      {(data?.complianceAlerts && data.complianceAlerts.length > 0) && (
        <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Carmack Compliance Alerts</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {data.complianceAlerts.join('. ')}.
              </p>
              <Link href="/claims/list?filter=compliance" className="text-sm text-amber-600 dark:text-amber-400 font-medium hover:underline mt-1 inline-block">
                Review Now →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
