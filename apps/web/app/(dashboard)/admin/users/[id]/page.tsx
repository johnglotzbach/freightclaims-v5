'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { get, put, post } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  ArrowLeft, Crown, Building2, Mail, Phone, Calendar,
  Shield, Key, Ban, CheckCircle, Users, FileText,
  CreditCard, Clock, Globe, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  roleName?: string | null;
  role?: string | null;
  roleId?: string | null;
  corporateId: string | null;
  corporateName?: string | null;
  corporateCode?: string | null;
  customerId: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt?: string;
  permissions?: string[];
}

interface WorkspaceInfo {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  planType: string | null;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
}

interface WorkspaceUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName?: string | null;
  role?: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

function extractItems<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

const planLabels: Record<string, string> = {
  starter: 'Starter',
  team: 'Team',
  pro: 'Pro / Growth',
  enterprise: 'Enterprise',
  white_label: 'White-Label',
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const isSA = !!currentUser?.isSuperAdmin;

  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => get<UserDetail>(`/users/${id}`),
    enabled: isSA && !!id,
  });

  const targetUser = userData as UserDetail | undefined;

  const { data: rawWsUsers } = useQuery({
    queryKey: ['admin-ws-users', targetUser?.corporateId],
    queryFn: () => get<unknown>('/users'),
    enabled: isSA && !!targetUser?.corporateId,
  });

  const { data: userStatsData } = useQuery({
    queryKey: ['admin-user-stats-detail', id],
    queryFn: () => get<{ data: { stats: { totalClaims: number; totalClaimValue: number; totalSettledValue: number } } }>(`/admin/user-stats/${id}`),
    enabled: isSA && !!id && !!targetUser,
  });

  const userStats = userStatsData?.data?.stats;

  const resetPasswordMutation = useMutation({
    mutationFn: () => post(`/users/${id}/reset-password`, {}),
    onSuccess: () => toast.success('Password reset email sent'),
    onError: () => toast.error('Failed to reset password'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (active: boolean) => put(`/users/${id}`, { isActive: active }),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const wsUsers: WorkspaceUser[] = extractItems<WorkspaceUser>(rawWsUsers)
    .filter((u) => (u as any).corporateId === targetUser?.corporateId && u.id !== targetUser?.id);

  if (!isSA) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Super Admin Access Required</h2>
        </div>
      </div>
    );
  }

  if (loadingUser) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 mt-3">Loading user...</p>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Not Found</h2>
        <button onClick={() => router.back()} className="mt-4 text-sm text-primary-500 font-medium">Go Back</button>
      </div>
    );
  }

  const displayRole = targetUser.isSuperAdmin ? 'Platform Owner' : (typeof targetUser.role === 'string' ? targetUser.role : targetUser.roleName) || 'User';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/admin/users')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to All Users
      </button>

      {/* User Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 dark:text-primary-300 text-xl font-bold">{targetUser.firstName?.[0]}{targetUser.lastName?.[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{targetUser.firstName} {targetUser.lastName}</h1>
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1',
                targetUser.isSuperAdmin
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              )}>
                {targetUser.isSuperAdmin && <Crown className="w-3 h-3" />}
                {displayRole}
              </span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1',
                targetUser.isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              )}>
                <span className={`w-1.5 h-1.5 rounded-full ${targetUser.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {targetUser.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{targetUser.email}</span>
              {targetUser.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{targetUser.phone}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Joined {new Date(targetUser.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Last login: {targetUser.lastLoginAt ? new Date(targetUser.lastLoginAt).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => resetPasswordMutation.mutate()}
            disabled={resetPasswordMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Key className="w-4 h-4 text-slate-400" /> Reset Password
          </button>
          <button
            onClick={() => toggleActiveMutation.mutate(!targetUser.isActive)}
            disabled={toggleActiveMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              targetUser.isActive
                ? 'border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                : 'border border-emerald-200 dark:border-emerald-900 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
            )}
          >
            {targetUser.isActive ? <><Ban className="w-4 h-4" /> Disable Account</> : <><CheckCircle className="w-4 h-4" /> Enable Account</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-500" />
              Account Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'User ID', value: targetUser.id.slice(0, 8) + '...' },
                { label: 'Email', value: targetUser.email },
                { label: 'First Name', value: targetUser.firstName },
                { label: 'Last Name', value: targetUser.lastName },
                { label: 'Phone', value: targetUser.phone || '—' },
                { label: 'Role', value: displayRole },
                { label: 'Super Admin', value: targetUser.isSuperAdmin ? 'Yes' : 'No' },
                { label: 'Created', value: new Date(targetUser.createdAt).toLocaleString() },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          {targetUser.permissions && targetUser.permissions.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-500" />
                Permissions ({targetUser.permissions.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {targetUser.permissions.map(p => (
                  <span key={p} className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Workspace Team Members */}
          {targetUser.corporateId && wsUsers.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-500" />
                Workspace Team ({wsUsers.length + 1} members)
              </h3>
              <div className="space-y-2">
                {wsUsers.map(wu => {
                  const r = typeof wu.role === 'string' ? wu.role : (wu.roleName || 'User');
                  return (
                    <Link
                      key={wu.id}
                      href={`/admin/users/${wu.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 dark:text-primary-300 text-[10px] font-bold">{wu.firstName?.[0]}{wu.lastName?.[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{wu.firstName} {wu.lastName}</p>
                        <p className="text-xs text-slate-400 truncate">{wu.email}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">{r}</span>
                      <span className={cn('w-2 h-2 rounded-full', wu.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Workspace & Billing */}
        <div className="space-y-6">
          {/* Workspace Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-500" />
              Workspace
            </h3>
            {targetUser.corporateName ? (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{targetUser.corporateName}</p>
                  {targetUser.corporateCode && <p className="text-xs text-slate-400 font-mono">{targetUser.corporateCode}</p>}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Team Size</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{wsUsers.length + 1} member{wsUsers.length > 0 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Workspace ID</span>
                    <span className="font-mono text-xs text-slate-400">{targetUser.corporateId?.slice(0, 8)}...</span>
                  </div>
                </div>
                <Link
                  href={`/customers/${targetUser.corporateId}`}
                  className="block w-full text-center text-sm font-medium text-primary-500 hover:text-primary-600 border border-primary-200 dark:border-primary-800 rounded-lg py-2 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
                >
                  View Workspace Details
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No workspace assigned</p>
                <p className="text-xs text-slate-400 mt-1">This user hasn&apos;t been added to a workspace yet.</p>
              </div>
            )}
          </div>

          {/* Billing / Plan */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-500" />
              Billing
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Plan</span>
                <span className="font-semibold text-slate-900 dark:text-white">Starter</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Active</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400">Stripe integration coming soon. Plans are currently managed manually.</p>
              </div>
            </div>
          </div>

          {/* Activity & Claim Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              Activity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Claims Filed', value: userStats?.totalClaims ?? '—', icon: FileText },
                { label: 'Claim Value', value: userStats ? `$${userStats.totalClaimValue.toLocaleString()}` : '—', icon: CreditCard },
                { label: 'Settled', value: userStats ? `$${userStats.totalSettledValue.toLocaleString()}` : '—', icon: CheckCircle },
                { label: 'Last Login', value: targetUser.lastLoginAt ? new Date(targetUser.lastLoginAt).toLocaleDateString() : 'Never', icon: Clock },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <s.icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
