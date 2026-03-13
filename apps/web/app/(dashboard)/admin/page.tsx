'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get, getList } from '@/lib/api-client';
import Link from 'next/link';
import {
  Crown, Globe, Users, FileText, DollarSign,
  TrendingUp, ArrowUpRight, ArrowDownRight, Building2,
  ChevronRight, BarChart3, Zap, Shield, HardDrive,
  Activity, CreditCard, AlertTriangle, Clock, CheckCircle,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformStats {
  workspaces: { total: number; active: number; newThisMonth: number };
  users: { total: number; active: number; newThisMonth: number; growth: number };
  claims: { total: number; thisMonth: number; growth: number };
  revenue: { totalClaimValue: number; totalSettledValue: number; collectionRate: number };
}

interface TeamAccount {
  id: string;
  name: string;
  owner?: { firstName?: string; lastName?: string; email?: string };
  plan?: string;
  userCount?: number;
  claimsThisMonth?: number;
  storageUsedMb?: number;
  status?: string;
}

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

const PLAN_PRICES: Record<string, number> = {
  starter: 99,
  team: 249,
  pro: 599,
  enterprise: 2000,
};

const MONTHLY_CLAIMS_LABELS = [
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
];

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: () => get<{ data: PlatformStats }>('/admin/platform-stats'),
    enabled: !!user?.isSuperAdmin,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => getList<TeamAccount>('/customers?type=corporate'),
    enabled: !!user?.isSuperAdmin,
  });

  const { data: usageData } = useQuery({
    queryKey: ['admin-usage'],
    queryFn: () => get<{ data: UsageData }>('/usage/current'),
    enabled: !!user?.isSuperAdmin,
  });

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Platform Owner Access</h2>
          <p className="text-slate-500 mt-2">This dashboard is only visible to platform owners.</p>
        </div>
      </div>
    );
  }

  const stats = statsData?.data;

  const planCounts: Record<string, number> = {};
  teams.forEach((t) => {
    const plan = (t.plan || 'starter').toLowerCase();
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });
  const mrr = Object.entries(planCounts).reduce(
    (sum, [plan, count]) => sum + (PLAN_PRICES[plan] ?? 99) * count,
    0,
  );

  const totalDocs = usageData?.data?.documentsUsed ?? 0;

  const kpis = [
    {
      label: 'Total Teams',
      value: stats?.workspaces.total ?? teams.length,
      sub: `${stats?.workspaces.active ?? teams.filter((t) => t.status !== 'inactive').length} active`,
      icon: Building2,
      color: 'text-primary-500 bg-primary-50 dark:bg-primary-500/10',
      change: stats?.workspaces.newThisMonth ?? null,
      changeLabel: 'new this month',
    },
    {
      label: 'Total Users',
      value: stats?.users.total ?? teams.reduce((s, t) => s + (t.userCount ?? 0), 0),
      sub: `${stats?.users.active ?? 0} active`,
      icon: Users,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
      change: stats?.users.growth ?? null,
      changeLabel: 'vs last month',
    },
    {
      label: 'Active Claims',
      value: stats?.claims.thisMonth ?? 0,
      sub: `${stats?.claims.total ?? 0} total all-time`,
      icon: FileText,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
      change: stats?.claims.growth ?? null,
      changeLabel: 'vs last month',
    },
    {
      label: 'Total Documents',
      value: totalDocs.toLocaleString(),
      sub: 'across all teams',
      icon: HardDrive,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
      change: null,
      changeLabel: '',
    },
    {
      label: 'MRR',
      value: `$${mrr.toLocaleString()}`,
      sub: `${teams.length} paying team${teams.length !== 1 ? 's' : ''}`,
      icon: DollarSign,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
      change: null,
      changeLabel: '',
    },
  ];

  const { data: monthlyData } = useQuery({
    queryKey: ['admin-monthly-claims'],
    queryFn: async () => {
      const months: number[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const from = d.toISOString().split('T')[0];
        const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        try {
          const res = await get<{ pagination?: { total?: number } }>(`/claims?dateFrom=${from}&dateTo=${to}&limit=1`);
          months.push(res?.pagination?.total ?? 0);
        } catch { months.push(0); }
      }
      return months;
    },
    enabled: !!user?.isSuperAdmin,
    staleTime: 300_000,
  });
  const chartData = monthlyData ?? Array(12).fill(0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Revenue Dashboard</h1>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Platform Owner</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
          <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Full Platform Access</span>
        </div>
      </div>

      {/* KPI Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', k.color)}>
                  <k.icon className="w-5 h-5" />
                </div>
                {k.change !== null && (
                  <span className={cn(
                    'flex items-center gap-0.5 text-xs font-semibold',
                    (k.change as number) >= 0 ? 'text-emerald-500' : 'text-red-500',
                  )}>
                    {(k.change as number) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(k.change as number)}{k.changeLabel.includes('vs') ? '%' : ''}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Claims Volume Chart + MRR Breakdown */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              Monthly Claims Volume
            </h3>
            <span className="text-xs text-slate-400">All teams</span>
          </div>
          <div className="flex items-end gap-2 h-44">
            {chartData.map((val, i) => {
              const maxVal = Math.max(...chartData);
              const pct = (val / maxVal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-medium">{val}</span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 transition-colors cursor-default"
                    style={{ height: `${pct}%` }}
                  />
                  <span className="text-[10px] text-slate-400">{MONTHLY_CLAIMS_LABELS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            MRR Breakdown
          </h3>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
            ${mrr.toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span>
          </div>
          <div className="space-y-3">
            {Object.entries(planCounts).map(([plan, count]) => {
              const planPrice = PLAN_PRICES[plan] ?? 99;
              return (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      plan === 'starter' ? 'bg-slate-400' :
                        plan === 'team' ? 'bg-primary-500' :
                          plan === 'pro' ? 'bg-violet-500' : 'bg-amber-500',
                    )} />
                    <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{plan}</span>
                    <span className="text-xs text-slate-400">x{count}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    ${(planPrice * count).toLocaleString()}
                  </span>
                </div>
              );
            })}
            {Object.keys(planCounts).length === 0 && (
              <p className="text-sm text-slate-400">No paying teams yet</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ARR</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">${(mrr * 12).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Accounts Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-500" />
            Team Accounts
          </h3>
          <Link
            href="/admin/workspaces"
            className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
          >
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Team</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Claims/Mo</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {teams.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No team accounts found
                  </td>
                </tr>
              )}
              {teams.slice(0, 10).map((team) => {
                const ownerName = team.owner
                  ? `${team.owner.firstName ?? ''} ${team.owner.lastName ?? ''}`.trim() || team.owner.email || '—'
                  : '—';
                const statusColor =
                  team.status === 'active' || !team.status
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : team.status === 'trial'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';

                return (
                  <tr key={team.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {team.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{ownerName}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-700 dark:text-slate-300 font-medium">
                        {team.plan || 'Starter'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                      {team.userCount ?? 1}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                      {team.claimsThisMonth ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                      {team.storageUsedMb != null
                        ? team.storageUsedMb > 1024
                          ? `${(team.storageUsedMb / 1024).toFixed(1)} GB`
                          : `${team.storageUsedMb} MB`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', statusColor)}>
                        {team.status || 'active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {teams.length > 10 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
            <Link
              href="/admin/workspaces"
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              View all {teams.length} teams
            </Link>
          </div>
        )}
      </div>

      {/* Supervisor Features */}
      <SupervisorSection />

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Platform Management
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'All Workspaces', desc: 'View teams, owners, members', href: '/admin/workspaces', icon: Globe, count: stats?.workspaces.total ?? teams.length },
            { label: 'All Users', desc: 'Manage every user on the platform', href: '/admin/users', icon: Users, count: stats?.users.total },
            { label: 'Billing & Plans', desc: 'Subscription tiers, Stripe config', href: '/admin/billing', icon: DollarSign },
            { label: 'Platform Settings', desc: 'Global config, email, API keys', href: '/admin/settings', icon: Shield },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-amber-300 dark:hover:border-amber-700 transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-amber-50 dark:group-hover:bg-amber-500/10 transition-colors">
                  <link.icon className="w-5 h-5 text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{link.label}</h3>
              <p className="text-xs text-slate-500 mt-1">{link.desc}</p>
              {link.count !== undefined && (
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-2">{link.count}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Supervisor Section ---------- */

function SupervisorSection() {
  const { data: overdueClaims = [] } = useQuery({
    queryKey: ['admin-overdue-claims'],
    queryFn: () => getList<any>('/claims?hasOverdueTasks=true&limit=10'),
    staleTime: 120_000,
  });

  const { data: pendingAckClaims = [] } = useQuery({
    queryKey: ['admin-pending-ack'],
    queryFn: () => getList<any>('/claims?status=pending&limit=10'),
    staleTime: 120_000,
  });

  const { data: staleClaims = [] } = useQuery({
    queryKey: ['admin-stale-claims'],
    queryFn: () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const to = thirtyDaysAgo.toISOString().split('T')[0];
      return getList<any>(`/claims?status=in_review&dateTo=${to}&limit=10`);
    },
    staleTime: 120_000,
  });

  const { data: resolvedThisWeek = [] } = useQuery({
    queryKey: ['admin-resolved-week'],
    queryFn: () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return getList<any>(`/claims?status=settled&dateFrom=${weekAgo.toISOString().split('T')[0]}&limit=50`);
    },
    staleTime: 120_000,
  });

  const { data: resolvedThisMonth = [] } = useQuery({
    queryKey: ['admin-resolved-month'],
    queryFn: () => {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      return getList<any>(`/claims?status=settled&dateFrom=${monthAgo.toISOString().split('T')[0]}&limit=200`);
    },
    staleTime: 120_000,
  });

  const { data: deniedThisMonth = [] } = useQuery({
    queryKey: ['admin-denied-month'],
    queryFn: () => {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      return getList<any>(`/claims?status=denied&dateFrom=${monthAgo.toISOString().split('T')[0]}&limit=200`);
    },
    staleTime: 120_000,
  });

  const totalResolvedMonth = resolvedThisMonth.length + deniedThisMonth.length;
  const denialRate = totalResolvedMonth > 0
    ? ((deniedThisMonth.length / totalResolvedMonth) * 100).toFixed(1)
    : '0.0';

  const avgResolutionDays = resolvedThisMonth.length > 0
    ? (resolvedThisMonth.reduce((sum: number, c: any) => {
        const created = new Date(c.createdAt).getTime();
        const updated = new Date(c.updatedAt || c.createdAt).getTime();
        return sum + (updated - created) / (1000 * 60 * 60 * 24);
      }, 0) / resolvedThisMonth.length).toFixed(1)
    : '—';

  const workloadMap: Record<string, { name: string; count: number }> = {};
  [...overdueClaims, ...pendingAckClaims].forEach((c: any) => {
    const assigneeId = c.assignedToId || 'unassigned';
    const assigneeName = c.assignedTo
      ? `${c.assignedTo.firstName || ''} ${c.assignedTo.lastName || ''}`.trim() || c.assignedTo.email || 'Unknown'
      : 'Unassigned';
    if (!workloadMap[assigneeId]) workloadMap[assigneeId] = { name: assigneeName, count: 0 };
    workloadMap[assigneeId].count++;
  });
  const workloadEntries = Object.values(workloadMap).sort((a, b) => b.count - a.count);
  const maxWorkload = Math.max(...workloadEntries.map((e) => e.count), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-primary-500" />
        Supervisor Dashboard
      </h2>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Resolved This Week', value: resolvedThisWeek.length, icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Resolved This Month', value: resolvedThisMonth.length, icon: TrendingUp, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Avg Resolution (days)', value: avgResolutionDays, icon: Clock, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Denial Rate', value: `${denialRate}%`, icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-500/10' },
        ].map((m) => (
          <div key={m.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', m.color)}>
              <m.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{m.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Workload Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary-500" />
            Workload Distribution
          </h3>
          {workloadEntries.length === 0 ? (
            <p className="text-sm text-slate-400">No active claim assignments</p>
          ) : (
            <div className="space-y-3">
              {workloadEntries.slice(0, 10).map((entry) => (
                <div key={entry.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300 truncate">{entry.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white ml-2">{entry.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all"
                      style={{ width: `${(entry.count / maxWorkload) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Queue Management */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" />
            Queue Management
          </h3>
          <div className="space-y-4">
            <QueueItem
              label="Overdue Tasks"
              count={overdueClaims.length}
              color="text-red-600 bg-red-50 dark:bg-red-500/10"
              claims={overdueClaims}
            />
            <QueueItem
              label="Pending Acknowledgment"
              count={pendingAckClaims.length}
              color="text-amber-600 bg-amber-50 dark:bg-amber-500/10"
              claims={pendingAckClaims}
            />
            <QueueItem
              label="Stale Claims (30+ days)"
              count={staleClaims.length}
              color="text-slate-600 bg-slate-100 dark:bg-slate-700"
              claims={staleClaims}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueItem({ label, count, color, claims }: {
  label: string;
  count: number;
  color: string;
  claims: any[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => count > 0 && setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', color)}>{count}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        {count > 0 && (
          <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', expanded && 'rotate-90')} />
        )}
      </button>
      {expanded && claims.length > 0 && (
        <div className="ml-12 mt-1 space-y-1">
          {claims.slice(0, 5).map((c: any) => (
            <Link
              key={c.id}
              href={`/claims/${c.id}`}
              className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <span className="font-mono font-medium text-slate-900 dark:text-white">{c.claimNumber}</span>
              <span className="text-slate-400">{c.customerName || '—'}</span>
            </Link>
          ))}
          {claims.length > 5 && (
            <Link href="/claims/list" className="block text-xs text-primary-500 hover:underline px-2 py-1">
              View all {claims.length} &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
