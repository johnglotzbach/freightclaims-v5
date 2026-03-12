'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, put, post } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import {
  Users, Plus, Edit2, Trash2, Mail, Shield,
  CheckCircle, XCircle, Search, UserPlus,
  MoreHorizontal, Key, ToggleLeft, ToggleRight, ShieldAlert,
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleName?: string;
  corporateName?: string;
  isSuperAdmin?: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.isSuperAdmin || currentUser?.permissions?.includes('settings.manage_users') || false;
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Claims Processor');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');

  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getList<User>('/users'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => post(`/users/${userId}/reset-password`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Password reset email sent');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reset password'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      put(`/users/${userId}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      put(`/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      setEditingUserId(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update user'),
  });

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string; firstName: string; lastName: string }) =>
      post('/users/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail('');
      setInviteFirst('');
      setInviteLast('');
      setInviteRole('Claims Processor');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send invitation'),
  });

  function handleInvite() {
    if (!inviteEmail.trim()) { toast.error('Email is required'); return; }
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
      firstName: inviteFirst.trim(),
      lastName: inviteLast.trim(),
    });
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500">You don&apos;t have permission to manage users. Contact your administrator.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-primary-500" /> User Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Loading users...</p>
          </div>
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-primary-500" /> User Management</h1>
          </div>
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            <UserPlus className="w-4 h-4" /> Invite User
          </button>
        </div>
        <EmptyState icon={Users} title="No users yet" description="Invite your first team member to get started." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-primary-500" /> User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} users · {users.filter(u => u.isActive).length} active{currentUser?.isSuperAdmin && ' · Viewing all accounts'}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <UserPlus className="w-4 h-4" /> Invite User
        </button>
      </div>

      {showInvite && (
        <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30 space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white">Invite New User</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" value={inviteFirst} onChange={(e) => setInviteFirst(e.target.value)} placeholder="First Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={inviteLast} onChange={(e) => setInviteLast(e.target.value)} placeholder="Last Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              <option>Administrator</option>
              <option>Claims Manager</option>
              <option>Claims Processor</option>
              <option>Viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button onClick={handleInvite} disabled={inviteMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Mail className="w-4 h-4 inline mr-1" /> Send Invitation</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Role</th>
              {currentUser?.isSuperAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Account</th>}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Last Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {filtered.map(user => (
              <Fragment key={user.id}>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600">{user.firstName[0]}{user.lastName[0]}</div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn(
                      'text-xs font-medium px-2 py-1 rounded',
                      user.isSuperAdmin ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    )}>
                      {user.isSuperAdmin ? 'Super Admin' : (user.roleName || (typeof user.role === 'string' ? user.role : 'User'))}
                    </span>
                  </td>
                  {currentUser?.isSuperAdmin && (
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{user.corporateName || '—'}</td>
                  )}
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-400"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => resetPasswordMutation.mutate(user.id)} disabled={resetPasswordMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-50" title="Reset Password"><Key className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActiveMutation.mutate({ userId: user.id, isActive: !user.isActive })} disabled={toggleActiveMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-50" title={user.isActive ? 'Deactivate' : 'Activate'}>
                        {user.isActive ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {editingUserId === user.id && (
                  <tr>
                    <td colSpan={currentUser?.isSuperAdmin ? 6 : 5} className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                      <UserEditForm user={user} onSave={(data) => updateUserMutation.mutate({ userId: user.id, data })} onCancel={() => setEditingUserId(null)} isSaving={updateUserMutation.isPending} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserEditForm({ user, onSave, onCancel, isSaving }: { user: User; onSave: (data: Partial<User>) => void; onCancel: () => void; isSaving: boolean }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState(user.roleName || (typeof user.role === 'string' ? user.role : 'User'));

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">First Name</label>
        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 w-36" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 w-36" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
          <option>Administrator</option>
          <option>Claims Manager</option>
          <option>Claims Processor</option>
          <option>Viewer</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ firstName, lastName, role })} disabled={isSaving} className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Save</button>
        <button onClick={onCancel} className="px-3 py-2 text-sm text-slate-500">Cancel</button>
      </div>
    </div>
  );
}
