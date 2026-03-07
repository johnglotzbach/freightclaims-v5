'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users, Plus, Edit2, Trash2, Mail, Shield,
  CheckCircle, XCircle, Search, UserPlus,
  MoreHorizontal, Key, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Claims Processor');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => get<User[]>('/users'),
  });

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleInvite() {
    if (!inviteEmail.trim()) { toast.error('Email is required'); return; }
    toast.success(`Invitation sent to ${inviteEmail}`);
    setShowInvite(false);
    setInviteEmail('');
    setInviteFirst('');
    setInviteLast('');
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
          <p className="text-sm text-slate-500 mt-0.5">{users.length} users &middot; {users.filter(u => u.isActive).length} active</p>
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
            <button onClick={handleInvite} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"><Mail className="w-4 h-4 inline mr-1" /> Send Invitation</button>
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Last Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600">{user.firstName[0]}{user.lastName[0]}</div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell"><span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{user.role}</span></td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-3">
                  {user.isActive ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Reset Password"><Key className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toast.success(user.isActive ? 'User deactivated' : 'User activated')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title={user.isActive ? 'Deactivate' : 'Activate'}>
                      {user.isActive ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
