'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get, getList } from '@/lib/api-client';
import Link from 'next/link';
import {
  Crown, Globe, Users, FileText, DollarSign,
  TrendingUp, ArrowUpRight, ArrowDownRight, Building2,
  ChevronRight, BarChart3, Zap, Shield, HardDrive,
  Activity, CreditCard,
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

  const chartData = [42, 58, 65, 53, 71, 88, 76, 94, 82, 105, 97, 120];

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
