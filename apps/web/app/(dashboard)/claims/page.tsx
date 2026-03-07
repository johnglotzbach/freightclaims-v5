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
import Link from 'next/link';
import {
  FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, DollarSign, Plus, Bot, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const statusColors: Record<string, string> = {
  draft: '#94a3b8', pending: '#f59e0b', in_review: '#3b82f6',
  approved: '#10b981', denied: '#ef4444', appealed: '#8b5cf6',
  in_negotiation: '#06b6d4', settled: '#22c55e', closed: '#64748b',
};

interface DashboardData {
  stats: { label: string; value: number; change?: number }[];
  claimsByStatus: { name: string; count: number }[];
  claimsByType: { name: string; count: number }[];
  monthlyTrend: { month: string; filed: number; settled: number; amount: number }[];
  topCarriers: { name: string; claims: number; avgSettlement: number }[];
  recentClaims: { id: string; claimNumber: string; title: string; status: string; amount: number; createdAt: string }[];
}

export default function ClaimsDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => get<DashboardData>('/reports/dashboard'),
    placeholderData: {
      stats: [
        { label: 'Total Claims', value: 1247, change: 12.5 },
        { label: 'Pending Review', value: 89, change: -3.2 },
        { label: 'Settlement Rate', value: 78, change: 5.1 },
        { label: 'Avg Settlement', value: 4250, change: 8.7 },
      ],
      claimsByStatus: [
        { name: 'Draft', count: 45 }, { name: 'Pending', count: 89 },
        { name: 'In Review', count: 67 }, { name: 'Approved', count: 123 },
        { name: 'Denied', count: 34 }, { name: 'In Negotiation', count: 56 },
        { name: 'Settled', count: 456 }, { name: 'Closed', count: 377 },
      ],
      claimsByType: [
        { name: 'Damage', count: 456 }, { name: 'Shortage', count: 234 },
        { name: 'Loss', count: 189 }, { name: 'Concealed', count: 145 },
        { name: 'Refused', count: 67 }, { name: 'Theft', count: 23 },
      ],
      monthlyTrend: [
        { month: 'Sep', filed: 95, settled: 72, amount: 285000 },
        { month: 'Oct', filed: 112, settled: 89, amount: 342000 },
        { month: 'Nov', filed: 98, settled: 95, amount: 310000 },
        { month: 'Dec', filed: 130, settled: 78, amount: 398000 },
        { month: 'Jan', filed: 108, settled: 102, amount: 325000 },
        { month: 'Feb', filed: 87, settled: 91, amount: 278000 },
      ],
      topCarriers: [
        { name: 'Southeastern FL', claims: 89, avgSettlement: 4200 },
        { name: 'XPO Logistics', claims: 67, avgSettlement: 5100 },
        { name: 'FedEx Freight', claims: 54, avgSettlement: 3800 },
        { name: 'Old Dominion', claims: 45, avgSettlement: 4600 },
        { name: 'Estes Express', claims: 38, avgSettlement: 3500 },
      ],
      recentClaims: [],
    },
  });

  const stats = data?.stats || [];
  const statIcons = [FileText, Clock, CheckCircle, DollarSign];

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Page header with quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat, i) => {
          const Icon = statIcons[i] || FileText;
          const isPositive = (stat.change || 0) > 0;
          return (
            <div key={stat.label} className="card p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="p-2 bg-primary-50 dark:bg-primary-950 rounded-xl">
                  <Icon className="w-5 h-5 text-primary-500" />
                </div>
                {stat.change !== undefined && (
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

      {/* Charts Row 1: Monthly Trend + Claims by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Monthly Filing & Settlement Trend */}
        <div className="card p-4 lg:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Monthly Trend</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-primary-500 rounded-full" /> Filed</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Settled</span>
            </div>
          </div>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyTrend}>
                <defs>
                  <linearGradient id="filedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="settledGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                />
                <Area type="monotone" dataKey="filed" stroke="#2563eb" fill="url(#filedGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="settled" stroke="#10b981" fill="url(#settledGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Claims by Status Pie */}
        <div className="card p-4 lg:p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">By Status</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.claimsByStatus}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  dataKey="count"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {data?.claimsByStatus?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {data?.claimsByStatus?.slice(0, 6).map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto font-medium text-slate-700 dark:text-slate-300">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Claims by Type + Top Carriers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Claims by Type Bar */}
        <div className="card p-4 lg:p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Claims by Type</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.claimsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={90} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Carriers Table */}
        <div className="card p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Top Carriers</h2>
            <Link href="/reports" className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2 font-medium">Carrier</th>
                  <th className="pb-2 font-medium text-right">Claims</th>
                  <th className="pb-2 font-medium text-right">Avg Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.topCarriers?.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{c.name}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.claims}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900 dark:text-white">${c.avgSettlement.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Compliance Alert Banner */}
      <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Carmack Compliance Alerts</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              3 claims approaching 120-day disposition deadline. 1 claim past 30-day acknowledgment window.
            </p>
            <Link href="/claims/list?filter=compliance" className="text-sm text-amber-600 dark:text-amber-400 font-medium hover:underline mt-1 inline-block">
              Review Now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
