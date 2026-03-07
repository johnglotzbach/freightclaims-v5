/**
 * Users Management Page — Admin/Manager view for managing team members,
 * roles, permissions, and invitations.
 *
 * Location: apps/web/app/(dashboard)/users/page.tsx
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getList } from '@/lib/api-client';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Users, Plus, Search, Shield, Mail, MoreHorizontal,
  Edit2, Trash2, UserPlus, Key, ChevronDown, CheckCircle2,
  XCircle, Clock, Filter,
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string | null;
}

const ROLES = ['Super Admin', 'Admin', 'Manager', 'Claims Handler', 'Viewer'];

const statusIcon: Record<string, React.ReactNode> = {
  active: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  inactive: <XCircle className="w-3.5 h-3.5 text-slate-400" />,
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getList<User>('/users'),
  });

  const filtered = users.filter((u) => {
    const matchesSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-500" /> Team Members
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Loading users...</p>
          </div>
        </div>
        <StatsSkeleton count={5} />
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-500" /> Team Members
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">0 users in your organization</p>
          </div>
          <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <UserPlus className="w-4 h-4" /> Invite User
          </button>
        </div>
        <EmptyState icon={Users} title="No team members" description="Invite your first team member to get started." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" /> Team Members
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{users.length} users in your organization</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <UserPlus className="w-4 h-4" /> Invite User
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ROLES.map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'All' : role)}
              className={`p-3 rounded-xl border text-center transition-all text-sm ${roleFilter === role ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-200'}`}
            >
              <div className="font-bold text-slate-900 dark:text-white text-lg">{count}</div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">{role}s</div>
            </button>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm appearance-none"
          >
            <option value="All">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Last Login</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{user.firstName[0]}{user.lastName[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <Shield className="w-3 h-3" /> {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize">
                      {statusIcon[user.status]} {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors" title="Reset Password">
                        <Key className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No users match your search.</div>
        )}
      </div>

      {/* Roles & Permissions Quick View */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-500" /> Roles &amp; Permissions Overview
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { role: 'Super Admin', desc: 'Full platform access, global management', perms: 26 },
            { role: 'Admin', desc: 'Full access within the organization', perms: 26 },
            { role: 'Manager', desc: 'Manage claims, users, and reports', perms: 20 },
            { role: 'Claims Handler', desc: 'Process and manage claims', perms: 13 },
            { role: 'Viewer', desc: 'Read-only access to claims and data', perms: 5 },
          ].map((r) => (
            <div key={r.role} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <div className="font-semibold text-slate-900 dark:text-white text-sm">{r.role}</div>
              <div className="text-xs text-slate-400 mt-0.5">{r.desc}</div>
              <div className="text-xs text-primary-500 mt-2">{r.perms} permissions</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" placeholder="colleague@company.com" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                  {ROLES.filter((r) => r !== 'Super Admin').map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors">Send Invite</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
