'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { get, put } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  User, Bell, Palette, Save, Camera, FileText,
} from 'lucide-react';

type ProfileTab = 'general' | 'notifications' | 'signature' | 'dashboard';

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');

  const tabs: { key: ProfileTab; label: string; icon: typeof User }[] = [
    { key: 'general', label: 'General', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'signature', label: 'Signature', icon: FileText },
    { key: 'dashboard', label: 'Dashboard', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><User className="w-6 h-6 text-primary-500" /> Personal Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your profile, preferences, and notification settings</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border', activeTab === t.key ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'signature' && <SignatureTab />}
      {activeTab === 'dashboard' && <DashboardTab />}
    </div>
  );
}

function GeneralTab() {
  const { data: user } = useQuery({ queryKey: ['profile'], queryFn: () => get<any>('/users/me') });
  const { data: prefs } = useQuery({ queryKey: ['preferences'], queryFn: () => get<any>('/users/me/preferences') });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    const p = prefs?.data || prefs;
    if (p?.timezone) setTimezone(p.timezone);
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; email: string; phone: string; timezone: string }) =>
      put('/users/me', data),
    onSuccess: () => toast.success('Profile updated'),
    onError: (err: Error) => toast.error(err.message || 'Failed to save profile'),
  });

  const initials = `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();

  return (
    <div className="card p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl font-bold text-primary-600">{initials}</div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg"><Camera className="w-3.5 h-3.5" /></button>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{firstName} {lastName}</h3>
          <p className="text-xs text-slate-500">{user?.roleName || (typeof user?.role === 'string' ? user.role : 'User')}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
        </select>
      </div>
      <button onClick={() => saveMutation.mutate({ firstName, lastName, email, phone, timezone })} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 disabled:opacity-50" disabled={saveMutation.isPending}><Save className="w-4 h-4" /> Save Changes</button>
    </div>
  );
}

function NotificationsTab() {
  const defaultPrefs: Record<string, { email: boolean; push: boolean; inApp: boolean }> = {
    claim_created: { email: true, push: true, inApp: true },
    claim_filed: { email: true, push: true, inApp: true },
    claim_settled: { email: true, push: false, inApp: true },
    claim_status_changed: { email: false, push: true, inApp: true },
    claim_assigned: { email: true, push: true, inApp: true },
    task_assigned: { email: true, push: true, inApp: true },
    task_due: { email: true, push: true, inApp: true },
    task_overdue: { email: true, push: true, inApp: true },
    task_completed: { email: false, push: false, inApp: true },
    email_received: { email: true, push: true, inApp: true },
    document_uploaded: { email: false, push: false, inApp: true },
    document_processed: { email: false, push: true, inApp: true },
    comment_added: { email: false, push: true, inApp: true },
    comment_mention: { email: true, push: true, inApp: true },
    automation_triggered: { email: false, push: false, inApp: true },
    stagnant_claim: { email: true, push: true, inApp: true },
  };
  const [preferences, setPreferences] = useState(defaultPrefs);
  const { data: savedPrefs } = useQuery({ queryKey: ['preferences'], queryFn: () => get<any>('/users/me/preferences') });

  useEffect(() => {
    const p = savedPrefs?.data || savedPrefs;
    if (p?.notificationPreferences && typeof p.notificationPreferences === 'object') {
      setPreferences(prev => ({ ...prev, ...p.notificationPreferences }));
    }
  }, [savedPrefs]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, { email: boolean; push: boolean; inApp: boolean }>) =>
      put('/users/me/preferences', { notificationPreferences: data }),
    onSuccess: () => toast.success('Notification preferences saved'),
    onError: (err: Error) => toast.error(err.message || 'Failed to save preferences'),
  });

  const categories: { label: string; items: { key: string; label: string }[] }[] = [
    { label: 'Claim Updates', items: [
      { key: 'claim_created', label: 'New claim created' },
      { key: 'claim_filed', label: 'Claim filed' },
      { key: 'claim_settled', label: 'Claim settled' },
      { key: 'claim_status_changed', label: 'Status changed' },
      { key: 'claim_assigned', label: 'Claim assigned to me' },
    ]},
    { label: 'Tasks', items: [
      { key: 'task_assigned', label: 'Task assigned to me' },
      { key: 'task_due', label: 'Task due reminder' },
      { key: 'task_overdue', label: 'Task overdue' },
      { key: 'task_completed', label: 'Task completed' },
    ]},
    { label: 'Emails & Documents', items: [
      { key: 'email_received', label: 'New email received' },
      { key: 'document_uploaded', label: 'Document uploaded' },
      { key: 'document_processed', label: 'AI document processed' },
    ]},
    { label: 'Comments', items: [
      { key: 'comment_added', label: 'Comment added' },
      { key: 'comment_mention', label: 'Mentioned in comment' },
    ]},
    { label: 'Automation', items: [
      { key: 'automation_triggered', label: 'Automation triggered' },
      { key: 'stagnant_claim', label: 'Stagnant claim alert' },
    ]},
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {categories.map(cat => (
        <div key={cat.label} className="card p-5">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">{cat.label}</h3>
          <div className="space-y-0">
            <div className="flex items-center gap-4 pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex-1" />
              <span className="w-16 text-center text-[10px] font-semibold text-slate-400 uppercase">Email</span>
              <span className="w-16 text-center text-[10px] font-semibold text-slate-400 uppercase">Push</span>
              <span className="w-16 text-center text-[10px] font-semibold text-slate-400 uppercase">In-App</span>
            </div>
            {cat.items.map(item => {
              const prefs = preferences[item.key] ?? { email: true, push: true, inApp: true };
              return (
                <div key={item.key} className="flex items-center gap-4 py-2">
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                  {(['email', 'push', 'inApp'] as const).map(channel => (
                    <div key={channel} className="w-16 flex justify-center">
                      <input type="checkbox" checked={prefs[channel]} onChange={() => setPreferences(prev => ({ ...prev, [item.key]: { ...prev[item.key], [channel]: !prefs[channel] } }))} className="rounded border-slate-300 text-primary-500 w-4 h-4" />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button onClick={() => saveMutation.mutate(preferences)} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" disabled={saveMutation.isPending}><Save className="w-4 h-4 inline mr-1" /> Save Preferences</button>
    </div>
  );
}

function SignatureTab() {
  const { data: user } = useQuery({ queryKey: ['profile'], queryFn: () => get<any>('/users/me') });
  const roleName = user?.roleName || (typeof user?.role === 'string' ? user.role : '') || '';
  const defaultSig = user ? `<p>Best regards,</p><p><strong>${user.firstName || ''} ${user.lastName || ''}</strong><br/>${roleName}<br/>FreightClaims<br/>${user.email || ''}</p>` : '';
  const [signature, setSignature] = useState('');
  const [sigLoaded, setSigLoaded] = useState(false);
  const { data: savedPrefs } = useQuery({ queryKey: ['preferences'], queryFn: () => get<any>('/users/me/preferences') });

  useEffect(() => {
    if (sigLoaded) return;
    const p = savedPrefs?.data || savedPrefs;
    if (p?.emailSignature) {
      setSignature(p.emailSignature);
      setSigLoaded(true);
    } else if (defaultSig && user) {
      setSignature(defaultSig);
      setSigLoaded(true);
    }
  }, [savedPrefs, defaultSig, user, sigLoaded]);

  const saveMutation = useMutation({
    mutationFn: (data: { signature: string }) => put('/users/me/preferences', { emailSignature: data.signature }),
    onSuccess: () => toast.success('Signature saved'),
    onError: (err: Error) => toast.error(err.message || 'Failed to save signature'),
  });

  return (
    <div className="card p-6 space-y-4 max-w-2xl">
      <h3 className="font-semibold text-slate-900 dark:text-white">Email Signature</h3>
      <p className="text-xs text-slate-500">This signature will be appended to all outgoing emails from your account</p>
      <textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={8} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono resize-none" />
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <p className="text-xs text-slate-500 mb-2">Preview</p>
        <div className="text-sm" dangerouslySetInnerHTML={{ __html: signature }} />
      </div>
      <button onClick={() => saveMutation.mutate({ signature })} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" disabled={saveMutation.isPending}><Save className="w-4 h-4 inline mr-1" /> Save Signature</button>
    </div>
  );
}

function DashboardTab() {
  const [defaultView, setDefaultView] = useState('claims');
  const [claimsPerPage, setClaimsPerPage] = useState(25);
  const [defaultDateRange, setDefaultDateRange] = useState('30');
  const allCols = ['Claim Number', 'PRO Number', 'Status', 'Customer', 'Carrier', 'Amount', 'Filed Date', 'Ship Date', 'Delivery Date', 'Type', 'Assigned To', 'Days Open'];
  const [columns, setColumns] = useState<Record<string, boolean>>(
    Object.fromEntries(allCols.map(c => [c, true]))
  );
  const { data: savedPrefs } = useQuery({ queryKey: ['preferences'], queryFn: () => get<any>('/users/me/preferences') });

  useEffect(() => {
    const p = savedPrefs?.data || savedPrefs;
    if (p?.dashboardSettings) {
      const s = p.dashboardSettings;
      if (s.defaultView) setDefaultView(s.defaultView);
      if (s.claimsPerPage) setClaimsPerPage(s.claimsPerPage);
      if (s.defaultDateRange) setDefaultDateRange(s.defaultDateRange);
      if (s.columns) setColumns(s.columns);
    }
  }, [savedPrefs]);

  const saveMutation = useMutation({
    mutationFn: (data: { defaultView: string; claimsPerPage: number; defaultDateRange: string; columns: Record<string, boolean> }) =>
      put('/users/me/preferences', { dashboardSettings: data }),
    onSuccess: () => toast.success('Dashboard settings saved'),
    onError: (err: Error) => toast.error(err.message || 'Failed to save settings'),
  });

  return (
    <div className="card p-6 space-y-5 max-w-2xl">
      <h3 className="font-semibold text-slate-900 dark:text-white">Dashboard Defaults</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Landing Page</label>
          <select value={defaultView} onChange={(e) => setDefaultView(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
            <option value="claims">Claims List</option>
            <option value="insights">Insights Dashboard</option>
            <option value="tasks">Task Manager</option>
            <option value="ai-entry">AI Entry</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Claims Per Page</label>
          <select value={claimsPerPage} onChange={(e) => setClaimsPerPage(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Date Range</label>
        <select value={defaultDateRange} onChange={(e) => setDefaultDateRange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 max-w-xs">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last Year</option>
          <option value="all">All Time</option>
        </select>
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white pt-4">Claims Table Columns</h3>
      <p className="text-xs text-slate-500 -mt-3">Select which columns to display in the claims list by default</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {['Claim Number', 'PRO Number', 'Status', 'Customer', 'Carrier', 'Amount', 'Filed Date', 'Ship Date', 'Delivery Date', 'Type', 'Assigned To', 'Days Open'].map(col => (
          <label key={col} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={columns[col] ?? true} onChange={() => setColumns(prev => ({ ...prev, [col]: !(prev[col] ?? true) }))} className="rounded border-slate-300 text-primary-500 w-3.5 h-3.5" /> {col}
          </label>
        ))}
      </div>
      <button onClick={() => saveMutation.mutate({ defaultView, claimsPerPage, defaultDateRange, columns })} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" disabled={saveMutation.isPending}><Save className="w-4 h-4 inline mr-1" /> Save Settings</button>
    </div>
  );
}
