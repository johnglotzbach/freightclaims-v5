'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get, put } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Crown, Building2,
  MoreVertical, Key, Ban, CheckCircle, Calendar, Mail,
  Filter, ChevronRight, X,
} from 'lucide-react';

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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const isSA = !!user?.isSuperAdmin;

  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => get<unknown>('/users'),
    enabled: isSA,
  });

  const { data: rawWorkspaces } = useQuery({
    queryKey: ['admin-workspaces-list'],
    queryFn: () => get<unknown>('/customers?type=corporate'),
    enabled: isSA,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => put(`/users/${userId}/reset-password`, {}),
    onSuccess: () => { toast.success('Password reset email sent'); setMenuOpen(null); },
    onError: () => toast.error('Failed to reset password'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      put(`/users/${userId}`, { isActive }),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setMenuOpen(null);
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Super Admin Access Required</h2>
          <p className="text-slate-500 mt-2">This page is only accessible to platform administrators.</p>
        </div>
      </div>
    );
  }

  const activeCount = allUsers.filter(u => u.isActive).length;
  const superAdminCount = allUsers.filter(u => u.isSuperAdmin).length;
  const wsCount = new Set(allUsers.map(u => u.corporateId).filter(Boolean)).size;
  const noWsCount = allUsers.filter(u => !u.corporateId).length;
  const hasFilters = wsFilter !== 'all' || statusFilter !== 'all' || search !== '';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Users className="w-7 h-7 text-amber-500" />
          All Users
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {allUsers.length} total · {activeCount} active · {wsCount} workspace{wsCount !== 1 ? 's' : ''} · {noWsCount} unassigned
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: allUsers.length, color: 'text-primary-500', icon: Users },
          { label: 'Active', value: activeCount, color: 'text-emerald-500', icon: CheckCircle },
          { label: 'Super Admins', value: superAdminCount, color: 'text-amber-500', icon: Crown },
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

      {/* User Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{hasFilters ? 'No users match your filters' : 'No users found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">User</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Workspace</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Last Active</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const displayRole = u.isSuperAdmin ? 'Super Admin' : (typeof u.role === 'string' ? u.role : u.roleName) || 'User';
                  return (
                    <tr
                      key={u.id}
                      onClick={() => router.push(`/admin/users/${u.id}`)}
                      className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 dark:text-primary-300 text-xs font-bold">{u.firstName?.[0]}{u.lastName?.[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail className="w-3 h-3 flex-shrink-0" />{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.corporateName ? (
                          <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[140px]">{u.corporateName}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.isSuperAdmin
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                            : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        }`}>
                          {u.isSuperAdmin && <Crown className="w-3 h-3" />}
                          {displayRole}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/users/${u.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          {menuOpen === u.id && (
                            <div className="absolute right-8 mt-24 z-20 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1">
                              <button onClick={() => router.push(`/admin/users/${u.id}`)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                                <Users className="w-4 h-4 text-slate-400" /> View Details
                              </button>
                              <button onClick={() => resetPasswordMutation.mutate(u.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                                <Key className="w-4 h-4 text-slate-400" /> Reset Password
                              </button>
                              <button onClick={() => toggleActiveMutation.mutate({ userId: u.id, isActive: !u.isActive })} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {u.isActive ? <><Ban className="w-4 h-4 text-red-400" /> Disable</> : <><CheckCircle className="w-4 h-4 text-emerald-400" /> Enable</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
