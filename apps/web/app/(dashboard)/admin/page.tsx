'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get } from '@/lib/api-client';
import Link from 'next/link';
import {
  Crown, Globe, Users, FileText, DollarSign,
  TrendingUp, ArrowUpRight, ArrowDownRight, Building2,
  ChevronRight, BarChart3, Zap, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformStats {
  workspaces: { total: number; active: number; newThisMonth: number };
  users: { total: number; active: number; newThisMonth: number; growth: number };
  claims: { total: number; thisMonth: number; growth: number };
  revenue: { totalClaimValue: number; totalSettledValue: number; collectionRate: number };
}

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: () => get<{ data: PlatformStats }>('/admin/platform-stats'),
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

  const kpis: Array<{ label: string; value: string | number; sub: string; icon: typeof Building2; color: string; change: number | null; changeLabel: string }> = [
    {
      label: 'Workspaces',
      value: stats?.workspaces.total ?? 0,
      sub: `${stats?.workspaces.active ?? 0} active`,
      icon: Building2,
      color: 'text-primary-500 bg-primary-50 dark:bg-primary-500/10',
      change: stats?.workspaces.newThisMonth ?? 0,
      changeLabel: 'new this month',
    },
    {
      label: 'Total Users',
      value: stats?.users.total ?? 0,
      sub: `${stats?.users.active ?? 0} active`,
      icon: Users,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
      change: stats?.users.growth ?? 0,
      changeLabel: 'vs last month',
    },
    {
      label: 'Total Claims',
      value: stats?.claims.total ?? 0,
      sub: `${stats?.claims.thisMonth ?? 0} this month`,
      icon: FileText,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
      change: stats?.claims.growth ?? 0,
      changeLabel: 'vs last month',
    },
    {
      label: 'Claim Volume',
      value: stats?.revenue.totalClaimValue
        ? `$${(stats.revenue.totalClaimValue / 1000).toFixed(0)}k`
        : '$0',
      sub: `${stats?.revenue.collectionRate ?? 0}% collection rate`,
      icon: DollarSign,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
      change: null,
      changeLabel: '',
    },
  ];

  const quickLinks = [
    { label: 'All Workspaces', desc: 'View teams, owners, members', href: '/admin/workspaces', icon: Globe, count: stats?.workspaces.total },
    { label: 'All Users', desc: 'Manage every user on the platform', href: '/admin/users', icon: Users, count: stats?.users.total },
    { label: 'Billing & Plans', desc: 'Subscription tiers, Stripe setup', href: '/admin/billing', icon: DollarSign },
    { label: 'Platform Settings', desc: 'Global config, email, API keys', href: '/admin/settings', icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Overview</h1>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Owner Dashboard</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
          <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Full Platform Access</span>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', k.color)}>
                  <k.icon className="w-5 h-5" />
                </div>
                {k.change !== null && (
                  <span className={cn(
                    'flex items-center gap-0.5 text-xs font-semibold',
                    k.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {k.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {typeof k.change === 'number' ? `${Math.abs(k.change)}${k.changeLabel.includes('vs') ? '%' : ''}` : k.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Platform Management
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(link => (
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

      {/* Platform Activity Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Revenue Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Claim Volume</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                ${(stats?.revenue.totalClaimValue ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Settled</span>
              <span className="text-lg font-bold text-emerald-500">
                ${(stats?.revenue.totalSettledValue ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Collection Rate</span>
              <span className="text-lg font-bold text-blue-500">{stats?.revenue.collectionRate ?? 0}%</span>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400">Stripe billing integration coming soon for MRR tracking.</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Growth This Month
          </h3>
          <div className="space-y-4">
            {[
              { label: 'New Workspaces', value: stats?.workspaces.newThisMonth ?? 0, icon: Building2 },
              { label: 'New Users', value: stats?.users.newThisMonth ?? 0, icon: Users },
              { label: 'Claims Filed', value: stats?.claims.thisMonth ?? 0, icon: FileText },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">{item.label}</p>
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
