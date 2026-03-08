'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get } from '@/lib/api-client';
import { Shield, Lock, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  description: string | null;
  userCount?: number;
  permissions?: { name: string }[];
}

function extractItems(raw: unknown): Role[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export default function WorkspaceRolesPage() {
  const { user, hasPermission } = useAuth();
  const canManage = user?.isSuperAdmin || hasPermission('roles.manage');

  const { data: rawRoles, isLoading } = useQuery({
    queryKey: ['workspace-roles'],
    queryFn: () => get<unknown>('/users/roles/all'),
  });

  const roles = extractItems(rawRoles);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Lock className="w-7 h-7 text-emerald-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">Define what each team member can access in your workspace</p>
        </div>
        {canManage && (
          <Link
            href="/settings/roles"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Shield className="w-4 h-4" />
            Manage Roles
          </Link>
        )}
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-2/3" />
            </div>
          ))
        ) : roles.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No roles defined yet</p>
          </div>
        ) : roles.map(role => (
          <div key={role.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-500" />
                {role.name}
              </h3>
              {role.userCount !== undefined && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {role.description && (
              <p className="text-sm text-slate-500 mb-3">{role.description}</p>
            )}
            {role.permissions && role.permissions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {role.permissions.slice(0, 6).map(p => (
                  <span key={p.name} className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    {p.name}
                  </span>
                ))}
                {role.permissions.length > 6 && (
                  <span className="text-[10px] text-slate-400 px-1.5 py-0.5">+{role.permissions.length - 6} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Permission Levels Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Permission Levels</h3>
        <div className="space-y-3">
          {[
            { name: 'Admin', desc: 'Full access to all features, user management, and workspace settings', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
            { name: 'Manager', desc: 'Manage claims, documents, companies, reports, and email. Can view users.', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
            { name: 'Claims Handler', desc: 'Process claims, upload documents, send emails. Core day-to-day operations.', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
            { name: 'Viewer', desc: 'Read-only access to claims, documents, and reports. Cannot make changes.', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
          ].map(level => (
            <div key={level.name} className="flex items-start gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${level.color}`}>
                {level.name}
              </span>
              <p className="text-sm text-slate-600 dark:text-slate-400">{level.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
