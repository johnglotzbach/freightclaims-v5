'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get, put, post } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Crown, Building2,
  Key, Ban, CheckCircle, Calendar, Mail,
  Filter, ChevronRight, ChevronDown, X, Shield,
  FileText, DollarSign, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName?: string | null;
  role?: string | null;
  corporateName?: string | null;
  corporateId?: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Workspace {
  id: string;
  name: string;
  code: string | null;
}

interface UserStats {
  user: any;
  stats: { totalClaims: number; totalClaimValue: number; totalSettledValue: number };
}

function extractItems<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [wsFilter, setWsFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const isSA = !!user?.isSuperAdmin;

  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => get<unknown>('/users?limit=100'),
    enabled: isSA,
  });

  const { data: rawWorkspaces } = useQuery({
    queryKey: ['admin-workspaces-list'],
    queryFn: () => get<unknown>('/customers?type=corporate&limit=100'),
    enabled: isSA,
  });

  const { data: userStatsData } = useQuery({
    queryKey: ['admin-user-stats', expandedUser],
    queryFn: () => get<{ data: UserStats }>(`/admin/user-stats/${expandedUser}`),
    enabled: isSA && !!expandedUser,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => post(`/users/${userId}/reset-password`, {}),
    onSuccess: () => toast.success('Password reset email sent'),
    onError: () => toast.error('Failed to reset password'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      put(`/users/${userId}`, { isActive }),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    },
    onError: () => toast.error('Failed to update user'),
  });

  const allUsers: User[] = extractItems(rawUsers);
  const workspaces: Workspace[] = extractItems(rawWorkspaces);

  const filtered = useMemo(() => {
    return allUsers.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        const match = u.email.toLowerCase().includes(q)
          || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
          || u.corporateName?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (wsFilter !== 'all') {
        if (wsFilter === 'none' && u.corporateId) return false;
        if (wsFilter !== 'none' && u.corporateId !== wsFilter) return false;
      }
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'disabled' && u.isActive) return false;
      return true;
    });
  }, [allUsers, search, wsFilter, statusFilter]);

  if (!isSA) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Platform Owner Access</h2>
          <p className="text-slate-500 mt-2">This page is only accessible to platform owners.</p>
        </div>
      </div>
    );
  }

  const activeCount = allUsers.filter(u => u.isActive).length;
  const superAdminCount = allUsers.filter(u => u.isSuperAdmin).length;
  const wsCount = new Set(allUsers.map(u => u.corporateId).filter(Boolean)).size;
  const hasFilters = wsFilter !== 'all' || statusFilter !== 'all' || search !== '';

  const expandedStats = userStatsData?.data?.stats;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-amber-500" />
            All Users
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {allUsers.length} total &middot; {activeCount} active &middot; {wsCount} workspace{wsCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin" className="text-sm text-amber-600 hover:text-amber-500 font-medium flex items-center gap-1">
          <ChevronRight className="w-3 h-3 rotate-180" /> Overview
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: allUsers.length, color: 'text-primary-500', icon: Users },
          { label: 'Active', value: activeCount, color: 'text-emerald-500', icon: CheckCircle },
          { label: 'Platform Owners', value: superAdminCount, color: 'text-amber-500', icon: Crown },
          { label: 'Workspaces', value: wsCount, color: 'text-blue-500', icon: Building2 },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or workspace..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={wsFilter}
            onChange={e => setWsFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Workspaces</option>
            <option value="none">No Workspace</option>
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setWsFilter('all'); setStatusFilter('all'); }}
              className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {hasFilters && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Filter className="w-3 h-3" />
          Showing {filtered.length} of {allUsers.length} users
        </p>
      )}

      {/* User List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{hasFilters ? 'No users match your filters' : 'No users found'}</p>
          </div>
        ) : (
          filtered.map(u => {
            const displayRole = u.isSuperAdmin ? 'Platform Owner' : (typeof u.role === 'string' ? u.role : u.roleName) || 'User';
            const isExpanded = expandedUser === u.id;
            const isShowingStats = isExpanded && expandedStats && expandedUser === u.id;

            return (
              <div key={u.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* User Row */}
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    u.isSuperAdmin
                      ? 'bg-amber-100 dark:bg-amber-900'
                      : 'bg-primary-100 dark:bg-primary-900'
                  )}>
                    <span className={cn(
                      'text-xs font-bold',
                      u.isSuperAdmin ? 'text-amber-700 dark:text-amber-300' : 'text-primary-700 dark:text-primary-300'
                    )}>{u.firstName?.[0]}{u.lastName?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.firstName} {u.lastName}</p>
                      {u.isSuperAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        u.isSuperAdmin
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      )}>{displayRole}</span>
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      )}>
                        <span className={cn('w-1 h-1 rounded-full', u.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" /> {u.email}</span>
                      {u.corporateName && (
                        <span className="hidden sm:flex items-center gap-1"><Building2 className="w-3 h-3" /> {u.corporateName}</span>
                      )}
                      <span className="hidden md:flex items-center gap-1"><Calendar className="w-3 h-3" /> {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')} />
                </button>

                {/* Expanded User Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      {/* Stats */}
                      <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-3 text-center">
                          <FileText className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{isShowingStats ? expandedStats.totalClaims : '...'}</p>
                          <p className="text-[10px] text-slate-500">Claims Filed</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-3 text-center">
                          <DollarSign className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {isShowingStats ? `$${expandedStats.totalClaimValue.toLocaleString()}` : '...'}
                          </p>
                          <p className="text-[10px] text-slate-500">Claim Value</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-3 text-center">
                          <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-emerald-500">
                            {isShowingStats ? `$${expandedStats.totalSettledValue.toLocaleString()}` : '...'}
                          </p>
                          <p className="text-[10px] text-slate-500">Settled</p>
                        </div>
                      </div>

                      {/* Info & Actions */}
                      <div className="space-y-2">
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-3 space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Workspace</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate ml-2">{u.corporateName || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Joined</span>
                            <span className="text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Last Login</span>
                            <span className="text-slate-400 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); resetPasswordMutation.mutate(u.id); }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                          >
                            <Key className="w-3 h-3" /> Reset PW
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleActiveMutation.mutate({ userId: u.id, isActive: !u.isActive }); }}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                              u.isActive
                                ? 'border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                                : 'border border-emerald-200 dark:border-emerald-900 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                            )}
                          >
                            {u.isActive ? <><Ban className="w-3 h-3" /> Disable</> : <><CheckCircle className="w-3 h-3" /> Enable</>}
                          </button>
                        </div>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block w-full text-center text-xs font-medium text-primary-500 hover:text-primary-600 border border-primary-200 dark:border-primary-800 rounded-lg py-2 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
                        >
                          Full Profile →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
