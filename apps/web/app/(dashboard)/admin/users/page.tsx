'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get, put, del } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Users, Search, Crown, Shield, Building2,
  MoreVertical, Key, Ban, CheckCircle, Calendar, Mail,
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

function extractItems(raw: unknown): User[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (!user?.isSuperAdmin) {
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

  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => get<unknown>('/users'),
  });

  const users = extractItems(rawUsers);
  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.corporateName?.toLowerCase().includes(search.toLowerCase())
  );

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

  const activeUsers = users.filter(u => u.isActive).length;
  const superAdmins = users.filter(u => u.isSuperAdmin).length;
  const workspaces = new Set(users.map(u => u.corporateId).filter(Boolean)).size;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Users className="w-7 h-7 text-amber-500" />
          All Users
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage every user account across all workspaces</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-primary-500' },
          { label: 'Active', value: activeUsers, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Super Admins', value: superAdmins, icon: Crown, color: 'text-amber-500' },
          { label: 'Workspaces', value: workspaces, icon: Building2, color: 'text-blue-500' },
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
          placeholder="Search users by name, email, or workspace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Workspace</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Last Login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const displayRole = u.isSuperAdmin ? 'Super Admin' : (typeof u.role === 'string' ? u.role : u.roleName) || 'User';
                return (
                  <tr key={u.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-primary-700 dark:text-primary-300 text-xs font-bold">{u.firstName?.[0]}{u.lastName?.[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.corporateName ? (
                        <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {u.corporateName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No workspace</span>
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
                        <Calendar className="w-3.5 h-3.5" />
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpen === u.id && (
                        <div className="absolute right-4 top-full z-10 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1">
                          <button
                            onClick={() => resetPasswordMutation.mutate(u.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            <Key className="w-4 h-4 text-slate-400" /> Reset Password
                          </button>
                          <button
                            onClick={() => toggleActiveMutation.mutate({ userId: u.id, isActive: !u.isActive })}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            {u.isActive ? (
                              <><Ban className="w-4 h-4 text-red-400" /> Disable Account</>
                            ) : (
                              <><CheckCircle className="w-4 h-4 text-emerald-400" /> Enable Account</>
                            )}
                          </button>
                        </div>
                      )}
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
