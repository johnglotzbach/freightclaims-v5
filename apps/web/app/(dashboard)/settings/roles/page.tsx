'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Shield, Plus, Edit2, Trash2, Users, ChevronRight,
  Check, X, Search, Copy,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  isSystem: boolean;
  permissions: string[];
}

const PERMISSION_CATEGORIES = [
  {
    category: 'Claims',
    permissions: [
      { key: 'claims.view', label: 'View Claims' },
      { key: 'claims.create', label: 'Create Claims' },
      { key: 'claims.edit', label: 'Edit Claims' },
      { key: 'claims.delete', label: 'Delete Claims' },
      { key: 'claims.file', label: 'File Claims' },
      { key: 'claims.close', label: 'Close Claims' },
      { key: 'claims.reopen', label: 'Reopen Claims' },
      { key: 'claims.assign', label: 'Assign Claims' },
      { key: 'claims.export', label: 'Export Claims' },
    ],
  },
  {
    category: 'Documents',
    permissions: [
      { key: 'documents.view', label: 'View Documents' },
      { key: 'documents.upload', label: 'Upload Documents' },
      { key: 'documents.delete', label: 'Delete Documents' },
      { key: 'documents.categorize', label: 'Recategorize Documents' },
    ],
  },
  {
    category: 'Companies',
    permissions: [
      { key: 'companies.view', label: 'View Companies' },
      { key: 'companies.create', label: 'Create Companies' },
      { key: 'companies.edit', label: 'Edit Companies' },
      { key: 'companies.delete', label: 'Delete Companies' },
      { key: 'companies.manage_contacts', label: 'Manage Contacts' },
      { key: 'companies.manage_products', label: 'Manage Products' },
      { key: 'companies.manage_locations', label: 'Manage Locations' },
    ],
  },
  {
    category: 'Tasks',
    permissions: [
      { key: 'tasks.view', label: 'View Tasks' },
      { key: 'tasks.create', label: 'Create Tasks' },
      { key: 'tasks.edit', label: 'Edit Tasks' },
      { key: 'tasks.delete', label: 'Delete Tasks' },
      { key: 'tasks.assign', label: 'Assign Tasks' },
    ],
  },
  {
    category: 'Emails',
    permissions: [
      { key: 'emails.view', label: 'View Emails' },
      { key: 'emails.send', label: 'Send Emails' },
      { key: 'emails.manage_templates', label: 'Manage Email Templates' },
    ],
  },
  {
    category: 'Reports & Insights',
    permissions: [
      { key: 'reports.view', label: 'View Reports' },
      { key: 'reports.create', label: 'Create Reports' },
      { key: 'reports.export', label: 'Export Reports' },
      { key: 'insights.view', label: 'View Insights' },
      { key: 'insights.configure', label: 'Configure Insights' },
    ],
  },
  {
    category: 'Settings & Admin',
    permissions: [
      { key: 'settings.manage_users', label: 'Manage Users' },
      { key: 'settings.manage_roles', label: 'Manage Roles' },
      { key: 'settings.manage_templates', label: 'Manage Templates' },
      { key: 'settings.manage_automation', label: 'Manage Automation' },
      { key: 'settings.manage_api', label: 'Manage API Keys' },
      { key: 'settings.manage_email_submission', label: 'Manage Email Submission' },
      { key: 'settings.view_audit_log', label: 'View Audit Log' },
      { key: 'settings.impersonate', label: 'Impersonate Users' },
    ],
  },
];

export default function RolesPage() {
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => get<Role[]>('/users/roles'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Shield className="w-6 h-6 text-primary-500" /> Roles & Permissions</h1>
            <p className="text-sm text-slate-500 mt-0.5">Loading roles...</p>
          </div>
        </div>
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Shield className="w-6 h-6 text-primary-500" /> Roles & Permissions</h1>
            <p className="text-sm text-slate-500 mt-0.5">Define access levels and permissions for your team</p>
          </div>
          <button onClick={() => { setEditingRole({ id: '', name: '', description: '', userCount: 0, isSystem: false, permissions: [] }); setIsCreating(true); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Create Role
          </button>
        </div>
        <EmptyState icon={Shield} title="No roles defined" description="Create your first role to manage team permissions." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Shield className="w-6 h-6 text-primary-500" /> Roles & Permissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Define access levels and permissions for your team</p>
        </div>
        <button onClick={() => { setEditingRole({ id: '', name: '', description: '', userCount: 0, isSystem: false, permissions: [] }); setIsCreating(true); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {editingRole && <RoleEditor role={editingRole} isNew={isCreating} onClose={() => { setEditingRole(null); setIsCreating(false); }} onSave={(role) => { toast.success(isCreating ? 'Role created' : 'Role updated'); setEditingRole(null); setIsCreating(false); }} />}

      <div className="grid gap-4">
        {roles.map(role => (
          <div key={role.id} className="card p-5 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                {role.isSystem && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">System</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs text-slate-400"><Users className="w-3.5 h-3.5" /> {role.userCount} users</span>
                <span className="text-xs text-slate-400">{role.permissions.length} permissions</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditingRole(role); setIsCreating(false); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => { setEditingRole({ ...role, id: '', name: `${role.name} (Copy)` }); setIsCreating(true); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Copy className="w-4 h-4" /></button>
              {!role.isSystem && <button onClick={() => toast.error('Cannot delete role with active users')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleEditor({ role, isNew, onClose, onSave }: { role: Role; isNew: boolean; onClose: () => void; onSave: (role: Role) => void }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [permissions, setPermissions] = useState<Set<string>>(new Set(role.permissions));

  function togglePermission(key: string) {
    const next = new Set(permissions);
    if (next.has(key)) next.delete(key); else next.add(key);
    setPermissions(next);
  }

  function toggleCategory(keys: string[]) {
    const next = new Set(permissions);
    const allSelected = keys.every(k => next.has(k));
    keys.forEach(k => allSelected ? next.delete(k) : next.add(k));
    setPermissions(next);
  }

  return (
    <div className="card p-6 space-y-5 border-2 border-primary-200 dark:border-primary-500/30">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">{isNew ? 'Create Role' : 'Edit Role'}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="e.g., Claims Manager" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Brief role description..." />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Permissions</h4>
        <div className="space-y-4">
          {PERMISSION_CATEGORIES.map(cat => {
            const keys = cat.permissions.map(p => p.key);
            const selectedCount = keys.filter(k => permissions.has(k)).length;
            const allSelected = selectedCount === keys.length;
            return (
              <div key={cat.category} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button onClick={() => toggleCategory(keys)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span>{cat.category}</span>
                  <span className="text-xs text-slate-400">{selectedCount}/{keys.length}</span>
                </button>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 px-4 pb-3">
                  {cat.permissions.map(p => (
                    <label key={p.key} className="flex items-center gap-2 text-xs cursor-pointer py-1">
                      <input type="checkbox" checked={permissions.has(p.key)} onChange={() => togglePermission(p.key)} className="rounded border-slate-300 text-primary-500 w-3.5 h-3.5" />
                      <span className={cn(permissions.has(p.key) ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 font-medium">Cancel</button>
        <button onClick={() => onSave({ ...role, name, description, permissions: Array.from(permissions) })} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"><Check className="w-4 h-4 inline mr-1" /> {isNew ? 'Create' : 'Save'} Role</button>
      </div>
    </div>
  );
}
