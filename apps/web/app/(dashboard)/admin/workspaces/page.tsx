'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get } from '@/lib/api-client';
import {
  Globe, Users, Building2, Search, ChevronDown, ChevronRight,
  Crown, CreditCard, Calendar, Mail, Shield, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WorkspaceUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  role?: { name: string } | null;
}

interface Workspace {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  planType: string | null;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  _count?: { corporateUsers?: number; claims?: number };
  corporateUsers?: WorkspaceUser[];
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
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isSA = !!user?.isSuperAdmin;

  const { data: rawWorkspaces, isLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: () => get<unknown>('/customers?type=corporate&limit=100'),
    enabled: isSA,
  });

  const workspaces = extractItems(rawWorkspaces);
  const filtered = workspaces.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = workspaces.reduce((sum, w) => sum + (w._count?.corporateUsers ?? w.corporateUsers?.length ?? 0), 0);
  const activeWorkspaces = workspaces.filter(w => w.isActive).length;
  const totalClaims = workspaces.reduce((sum, w) => sum + (w._count?.claims ?? 0), 0);

  if (!isSA) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Platform Owner Access</h2>
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
          <p className="text-sm text-slate-500 mt-1">View and manage all teams on the platform</p>
        </div>
        <Link href="/admin" className="text-sm text-amber-600 hover:text-amber-500 font-medium flex items-center gap-1">
          <ChevronRight className="w-3 h-3 rotate-180" /> Overview
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Workspaces', value: workspaces.length, icon: Building2, color: 'text-primary-500' },
          { label: 'Active', value: activeWorkspaces, icon: Globe, color: 'text-emerald-500' },
          { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-500' },
          { label: 'Total Claims', value: totalClaims, icon: FileText, color: 'text-amber-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-[11px] text-slate-500">{stat.label}</p>
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

      {/* Workspace Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
              <div className="h-4 w-60 bg-slate-100 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No workspaces found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ws => {
            const plan = planLabels[ws.planType || 'starter'] || planLabels.starter;
            const userCount = ws._count?.corporateUsers ?? ws.corporateUsers?.length ?? 0;
            const claimCount = ws._count?.claims ?? 0;
            const isExpanded = expandedId === ws.id;
            const members = ws.corporateUsers || [];
            const owner = members.find(m => m.role?.name === 'Admin') || members[0];

            return (
              <div key={ws.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Workspace Header Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ws.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 dark:text-primary-300 text-sm font-bold">{ws.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{ws.name}</p>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', plan.color)}>{plan.label}</span>
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                        ws.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      )}>
                        <span className={cn('w-1 h-1 rounded-full', ws.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                        {ws.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {ws.code && <span className="font-mono">{ws.code}</span>}
                      {owner && <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {owner.firstName} {owner.lastName}</span>}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {userCount} user{userCount !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {claimCount} claim{claimCount !== 1 ? 's' : ''}</span>
                      <span className="hidden sm:flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ws.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')} />
                </button>

                {/* Expanded Team View */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="p-4 grid md:grid-cols-3 gap-4">
                      {/* Team Members */}
                      <div className="md:col-span-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Users className="w-3 h-3" /> Team Members ({members.length})
                        </h4>
                        {members.length > 0 ? (
                          <div className="space-y-1.5">
                            {members.map(m => {
                              const isOwner = m.role?.name === 'Admin';
                              const roleName = m.role?.name || 'User';
                              return (
                                <Link
                                  key={m.id}
                                  href={`/admin/users/${m.id}`}
                                  className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                                >
                                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                                    <span className="text-primary-700 dark:text-primary-300 text-[10px] font-bold">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex items-center gap-1.5">
                                      {m.firstName} {m.lastName}
                                      {isOwner && <Crown className="w-3 h-3 text-amber-500" />}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {m.email}</p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={cn(
                                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                      isOwner
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                        : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                                    )}>
                                      {isOwner ? 'Owner' : roleName}
                                    </span>
                                    <span className={cn('w-2 h-2 rounded-full', m.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 py-3">No team members found</p>
                        )}
                      </div>

                      {/* Workspace Details */}
                      <div className="space-y-3">
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Details</h4>
                          <div className="space-y-2.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Plan</span>
                              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', plan.color)}>{plan.label}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">User Slots</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{userCount} / {ws.maxUsers || '∞'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Claims</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{claimCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Created</span>
                              <span className="text-slate-400 text-xs">{new Date(ws.createdAt).toLocaleDateString()}</span>
                            </div>
                            {ws.email && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Email</span>
                                <span className="text-slate-400 text-xs truncate ml-2">{ws.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/customers/${ws.id}`}
                          className="block w-full text-center text-sm font-medium text-primary-500 hover:text-primary-600 border border-primary-200 dark:border-primary-800 rounded-lg py-2 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
                        >
                          View Full Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
