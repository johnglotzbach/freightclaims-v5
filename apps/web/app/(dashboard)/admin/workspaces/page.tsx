'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get } from '@/lib/api-client';
import {
  Globe, Users, Building2, Search, ChevronRight,
  Crown, BarChart3, CreditCard, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Workspace {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  planType: string | null;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  _count?: { corporateUsers?: number };
  corporateUsers?: { id: string }[];
}

function extractItems(raw: unknown): Workspace[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

const planLabels: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  team: { label: 'Team', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  pro: { label: 'Pro', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  white_label: { label: 'White-Label', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
};

export default function AdminWorkspacesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const isSA = !!user?.isSuperAdmin;

  const { data: rawWorkspaces, isLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: () => get<unknown>('/customers?type=corporate'),
    enabled: isSA,
  });

  const workspaces = extractItems(rawWorkspaces);
  const filtered = workspaces.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = workspaces.reduce((sum, w) => sum + (w._count?.corporateUsers || w.corporateUsers?.length || 0), 0);
  const activeWorkspaces = workspaces.filter(w => w.isActive).length;

  if (!isSA) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Globe className="w-7 h-7 text-amber-500" />
            All Workspaces
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage all corporate accounts and their subscriptions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Workspaces', value: workspaces.length, icon: Building2, color: 'text-primary-500' },
          { label: 'Active', value: activeWorkspaces, icon: Globe, color: 'text-emerald-500' },
          { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-500' },
          { label: 'Revenue (MRR)', value: '$0', icon: CreditCard, color: 'text-amber-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search workspaces by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Workspace List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Loading workspaces...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No workspaces found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Workspace</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Plan</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Users</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(ws => {
                const plan = planLabels[ws.planType || 'starter'] || planLabels.starter;
                const userCount = ws._count?.corporateUsers || ws.corporateUsers?.length || 0;
                return (
                  <tr key={ws.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-primary-700 dark:text-primary-300 text-xs font-bold">{ws.name.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{ws.name}</p>
                          <p className="text-xs text-slate-400">{ws.code || ws.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.color}`}>
                        {plan.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{userCount}</span>
                        <span className="text-xs text-slate-400">/ {ws.maxUsers || '∞'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        ws.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ws.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {ws.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {ws.createdAt ? new Date(ws.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/customers/${ws.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
