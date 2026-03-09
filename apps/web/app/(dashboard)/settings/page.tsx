'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { get, put, post, del } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Settings, User, Bell, Mail, Globe, Shield, Palette,
  Plus, Trash2, Edit2, Check, X as XIcon, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';

const THEME_KEY = 'theme';
const DENSITY_KEY = 'density';

type SettingsTab = 'profile' | 'notifications' | 'email-submission' | 'security' | 'appearance';

interface ApprovedDomain {
  id: string;
  domain: string;
  isActive: boolean;
}

interface ApprovedSender {
  id: string;
  email: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs: { key: SettingsTab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'email-submission', label: 'Email Submission', icon: Mail },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-500" /> Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your account, preferences, and system configuration</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'profile' && <ProfileSection user={user} />}
          {activeTab === 'notifications' && <NotificationsSection />}
          {activeTab === 'email-submission' && <EmailSubmissionSection />}
          {activeTab === 'security' && <SecuritySection />}
          {activeTab === 'appearance' && <AppearanceSection />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user }: { user: any }) {
  const { loadUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; email: string; phone?: string }) =>
      put('/users/me', data),
    onSuccess: () => {
      loadUser();
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update profile'),
  });

  function handleSave() {
    saveMutation.mutate({ firstName, lastName, email, phone: phone || undefined });
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <button onClick={handleSave} disabled={saveMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

const NOTIFICATION_KEYS = [
  { label: 'Email notifications for new claims', key: 'newClaims', defaultChecked: true },
  { label: 'Email notifications for status changes', key: 'statusChanges', defaultChecked: true },
  { label: 'Email notifications for task assignments', key: 'taskAssignments', defaultChecked: true },
  { label: 'Email notifications for overdue tasks', key: 'overdueTasks', defaultChecked: true },
  { label: 'Push notifications', key: 'push', defaultChecked: true },
  { label: 'Daily digest email', key: 'dailyDigest', defaultChecked: false },
  { label: 'Weekly summary report', key: 'weeklyReport', defaultChecked: true },
  { label: 'AI agent completion alerts', key: 'aiAlerts', defaultChecked: true },
] as const;

function NotificationsSection() {
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: () => get<Record<string, boolean>>('/users/me/preferences'),
  });

  const preferences = NOTIFICATION_KEYS.reduce((acc, item) => {
    acc[item.key] = prefs?.[item.key] ?? item.defaultChecked;
    return acc;
  }, {} as Record<string, boolean>);

  const updatePrefsMutation = useMutation({
    mutationFn: (preferences: Record<string, boolean>) => put('/users/me/preferences', preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast.success('Preferences updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update preferences'),
  });

  function handlePrefChange(key: string, checked: boolean) {
    const next = { ...preferences, [key]: checked };
    updatePrefsMutation.mutate(next);
  }

  if (isLoading) return <div className="card p-6"><p className="text-sm text-slate-500">Loading preferences...</p></div>;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          {NOTIFICATION_KEYS.map(item => (
            <label key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
              <input type="checkbox" checked={preferences[item.key] ?? item.defaultChecked} onChange={(e) => handlePrefChange(item.key, e.target.checked)} className="rounded border-slate-300 text-primary-500 focus:ring-primary-500" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

interface EmailSubmissionConfig {
  domains: ApprovedDomain[];
  senders: ApprovedSender[];
  submissionPrefix?: string;
  companyDomain?: string;
}

const DEFAULT_DOMAINS: ApprovedDomain[] = [];
const DEFAULT_SENDERS: ApprovedSender[] = [];

function EmailSubmissionSection() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['email-submission-config'],
    queryFn: () => get<EmailSubmissionConfig>('/email-submission/config'),
    retry: false,
  });

  const [domains, setDomains] = useState<ApprovedDomain[]>(DEFAULT_DOMAINS);
  const [senders, setSenders] = useState<ApprovedSender[]>(DEFAULT_SENDERS);
  const [newDomain, setNewDomain] = useState('');
  const [newSender, setNewSender] = useState('');
  const [submissionPrefix, setSubmissionPrefix] = useState('claimsubmission');
  const [companyDomain, setCompanyDomain] = useState('');

  useEffect(() => {
    if (config) {
      if (config.domains?.length) setDomains(config.domains);
      if (config.senders?.length) setSenders(config.senders);
      if (config.submissionPrefix) setSubmissionPrefix(config.submissionPrefix);
      if (config.companyDomain) setCompanyDomain(config.companyDomain);
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: (data: { domains: ApprovedDomain[]; senders: ApprovedSender[]; submissionPrefix?: string; companyDomain?: string }) =>
      put('/email-submission/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-submission-config'] });
      toast.success('Email submission config updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update config'),
  });

  function addDomain() {
    if (!newDomain.trim()) return;
    const domain = newDomain.startsWith('@') ? newDomain : `@${newDomain}`;
    const next = [...domains, { id: Date.now().toString(), domain, isActive: true }];
    setDomains(next);
    setNewDomain('');
    saveConfigMutation.mutate({ domains: next, senders });
  }

  function addSender() {
    if (!newSender.trim()) return;
    const next = [...senders, { id: Date.now().toString(), email: newSender, isActive: true }];
    setSenders(next);
    setNewSender('');
    saveConfigMutation.mutate({ domains, senders: next });
  }

  function toggleDomain(id: string) {
    const next = domains.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d);
    setDomains(next);
    saveConfigMutation.mutate({ domains: next, senders });
  }

  function toggleSender(id: string) {
    const next = senders.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setSenders(next);
    saveConfigMutation.mutate({ domains, senders: next });
  }

  function removeDomain(id: string) {
    const next = domains.filter(d => d.id !== id);
    setDomains(next);
    saveConfigMutation.mutate({ domains: next, senders });
  }

  function removeSender(id: string) {
    const next = senders.filter(s => s.id !== id);
    setSenders(next);
    saveConfigMutation.mutate({ domains, senders: next });
  }

  if (isLoading) return <div className="card p-6"><p className="text-sm text-slate-500">Loading email submission config...</p></div>;

  return (
    <div className="space-y-6">
      {/* Submission Email Address */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Submission Email Address</h2>
        <p className="text-sm text-slate-500 mb-4">
          This is the email address that you can use to send documents to FreightClaims for processing.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <div className="flex items-center border rounded-lg overflow-hidden dark:border-slate-600">
              <input
                type="text"
                value={submissionPrefix}
                onChange={(e) => setSubmissionPrefix(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border-0 focus:ring-0 dark:bg-slate-700"
              />
              <span className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-sm text-slate-500 border-l dark:border-slate-600">
                @{companyDomain}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Approved Senders */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Approved Senders</h2>
        <p className="text-sm text-slate-500 mb-4">
          These are the approved domains and individual senders who may submit documents to the claim submission address. Emails from non-approved senders will be automatically rejected.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Approved Email Domains */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Approved Email Domains</h3>
            <div className="space-y-2 mb-3">
              {domains.map(domain => (
                <div key={domain.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleDomain(domain.id)}>
                      {domain.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                    <span className={cn('text-sm', domain.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
                      {domain.domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeDomain(domain.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="@example.com"
                className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              />
              <button onClick={addDomain} className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> New Approved Domain
              </button>
            </div>
          </div>

          {/* Approved Email Addresses */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Approved Email Addresses</h3>
            <div className="space-y-2 mb-3">
              {senders.map(sender => (
                <div key={sender.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSender(sender.id)}>
                      {sender.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                    <span className={cn('text-sm', sender.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
                      {sender.email}
                    </span>
                  </div>
                  <button onClick={() => removeSender(sender.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={newSender}
                onChange={(e) => setNewSender(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                onKeyDown={(e) => e.key === 'Enter' && addSender()}
              />
              <button onClick={addSender} className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> New Approved Sender
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [tfaStep, setTfaStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [tfaSecret, setTfaSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    setTwoFactorEnabled(!!(user as any)?.twoFactorEnabled);
  }, [user]);

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      put('/users/me/password', data),
    onSuccess: () => {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update password'),
  });

  const setupMutation = useMutation({
    mutationFn: () => post<{ secret: string; otpauth: string }>('/users/2fa/setup', {}),
    onSuccess: (data) => {
      setTfaSecret(data.secret);
      setOtpauthUri(data.otpauth);
      setTfaStep('verify');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to start 2FA setup'),
  });

  const verifyMutation = useMutation({
    mutationFn: (code: string) => post<{ enabled: boolean }>('/users/2fa/verify', { code }),
    onSuccess: () => {
      toast.success('Two-factor authentication enabled');
      setTwoFactorEnabled(true);
      setTfaStep('idle');
      setVerifyCode('');
      setOtpauthUri('');
      setTfaSecret('');
    },
    onError: (err: Error) => toast.error(err.message || 'Invalid verification code'),
  });

  const disableMutation = useMutation({
    mutationFn: (password: string) => post<{ enabled: boolean }>('/users/2fa/disable', { password }),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled');
      setTwoFactorEnabled(false);
      setShowDisableConfirm(false);
      setDisablePassword('');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to disable 2FA'),
  });

  function handleUpdatePassword() {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Change Password</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <button onClick={handleUpdatePassword} disabled={passwordMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            Update Password
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Two-Factor Authentication</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            twoFactorEnabled
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-400')} />
            {twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {twoFactorEnabled
            ? 'Your account is protected with two-factor authentication.'
            : 'Add an extra layer of security to your account by enabling two-factor authentication.'}
        </p>

        {!twoFactorEnabled && tfaStep === 'idle' && (
          <button
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            className="border border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {setupMutation.isPending ? 'Setting up...' : 'Enable 2FA'}
          </button>
        )}

        {tfaStep === 'verify' && (
          <div className="space-y-4 max-w-md">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                1. Scan this QR code with your authenticator app
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Or enter this secret manually:</p>
                <code className="block text-xs bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-700 font-mono break-all select-all">
                  {tfaSecret}
                </code>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                2. Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm tracking-widest text-center font-mono text-lg"
                onKeyDown={(e) => e.key === 'Enter' && verifyCode.length === 6 && verifyMutation.mutate(verifyCode)}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => verifyMutation.mutate(verifyCode)}
                disabled={verifyCode.length !== 6 || verifyMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {verifyMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => { setTfaStep('idle'); setVerifyCode(''); setOtpauthUri(''); setTfaSecret(''); }}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {twoFactorEnabled && !showDisableConfirm && (
          <button
            onClick={() => setShowDisableConfirm(true)}
            className="border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Disable 2FA
          </button>
        )}

        {showDisableConfirm && (
          <div className="space-y-3 max-w-md">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter your password to confirm disabling two-factor authentication.
            </p>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && disablePassword && disableMutation.mutate(disablePassword)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => disableMutation.mutate(disablePassword)}
                disabled={!disablePassword || disableMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {disableMutation.isPending ? 'Disabling...' : 'Confirm Disable'}
              </button>
              <button
                onClick={() => { setShowDisableConfirm(false); setDisablePassword(''); }}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ThemeValue = 'light' | 'dark' | 'system';
type DensityValue = 'comfortable' | 'compact' | 'dense';

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeValue>((theme as ThemeValue) ?? 'system');

  const [density, setDensityState] = useState<DensityValue>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    return (localStorage.getItem(DENSITY_KEY) as DensityValue) || 'comfortable';
  });

  useEffect(() => {
    const t = (theme ?? 'system') as ThemeValue;
    setCurrentTheme(t);
  }, [theme]);

  useEffect(() => {
    const stored = localStorage.getItem(DENSITY_KEY) as DensityValue | null;
    if (stored && ['comfortable', 'compact', 'dense'].includes(stored)) {
      setDensityState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-density', density);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(DENSITY_KEY, density);
    }
  }, [density]);

  function handleThemeChange(value: ThemeValue) {
    setTheme(value);
    if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, value);
    const isDark = value === 'dark' || (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }

  function handleDensityChange(value: DensityValue) {
    setDensityState(value);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Theme</h2>
        <div className="grid grid-cols-3 gap-3">
          {(['Light', 'Dark', 'System'] as const).map(label => {
            const value = label.toLowerCase() as ThemeValue;
            const isActive = currentTheme === value;
            return (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={cn(
                  'p-4 rounded-xl border text-center text-sm font-medium transition-all',
                  isActive
                    ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-950 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Density</h2>
        <div className="grid grid-cols-3 gap-3">
          {(['Comfortable', 'Compact', 'Dense'] as const).map(label => {
            const value = label.toLowerCase() as DensityValue;
            const isActive = density === value;
            return (
              <button
                key={value}
                onClick={() => handleDensityChange(value)}
                className={cn(
                  'p-4 rounded-xl border text-center text-sm font-medium transition-all',
                  isActive
                    ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-950 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
