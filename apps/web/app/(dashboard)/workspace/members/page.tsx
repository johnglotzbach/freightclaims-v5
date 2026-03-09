'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get, post, put, del } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Users, UserPlus, Search, Key, Ban, CheckCircle,
  MoreVertical, Mail, Shield, Calendar, X,
} from 'lucide-react';

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName?: string | null;
  role?: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
}

function extractItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export default function WorkspaceMembersPage() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', password: '', roleId: '' });

  const canManage = user?.isSuperAdmin || hasPermission('users.manage');

  const { data: rawMembers, isLoading } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: () => get<unknown>('/users'),
  });

  const { data: rawRoles } = useQuery({
    queryKey: ['workspace-roles'],
    queryFn: () => get<unknown>('/users/roles/all'),
  });

  const members: Member[] = extractItems(rawMembers);
  const roles: Role[] = extractItems(rawRoles);

  const filtered = members.filter(m =>
    !search ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const inviteMutation = useMutation({
    mutationFn: (data: typeof inviteForm) => post('/users/invite', data),
    onSuccess: () => {
      toast.success('Team member added successfully');
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      setShowInvite(false);
      setInviteForm({ email: '', firstName: '', lastName: '', password: '', roleId: '' });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add team member'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => post(`/users/${userId}/reset-password`, {}),
    onSuccess: () => { toast.success('Password reset sent'); setMenuOpen(null); },
    onError: () => toast.error('Failed to reset password'),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-emerald-500" />
            Team Members
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your team · {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No team members found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map(m => {
              const displayRole = typeof m.role === 'string' ? m.role : (m.roleName || 'User');
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 dark:text-primary-300 text-sm font-bold">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {displayRole}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {m.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 min-w-[80px]">
                      <Calendar className="w-3 h-3" />
                      {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : 'Never'}
                    </span>
                    {canManage && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen === m.id && (
                          <div className="absolute right-0 top-full z-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1">
                            <button
                              onClick={() => { resetPasswordMutation.mutate(m.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              <Key className="w-4 h-4 text-slate-400" /> Reset Password
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"
                              onClick={() => setMenuOpen(null)}
                            >
                              <Ban className="w-4 h-4" /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-500" />
                Add Team Member
              </h3>
              <button onClick={() => setShowInvite(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Temp Password</label>
                <input
                  type="text"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white"
                  placeholder="Min 8 chars, 1 upper, 1 number, 1 special"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select
                  value={inviteForm.roleId}
                  onChange={(e) => setInviteForm(f => ({ ...f, roleId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white bg-white"
                >
                  <option value="">Select a role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => inviteMutation.mutate(inviteForm)}
                disabled={!inviteForm.email || !inviteForm.firstName || !inviteForm.password || inviteMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {inviteMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
