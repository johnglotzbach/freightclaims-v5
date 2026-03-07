'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  Settings, User, Bell, Mail, Globe, Shield, Palette,
  Plus, Trash2, Edit2, Check, X as XIcon, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';

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
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
              <input type="text" defaultValue={user?.firstName} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
              <input type="text" defaultValue={user?.lastName} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input type="email" defaultValue={user?.email} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input type="tel" placeholder="(555) 000-0000" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          {[
            { label: 'Email notifications for new claims', key: 'newClaims', defaultChecked: true },
            { label: 'Email notifications for status changes', key: 'statusChanges', defaultChecked: true },
            { label: 'Email notifications for task assignments', key: 'taskAssignments', defaultChecked: true },
            { label: 'Email notifications for overdue tasks', key: 'overdueTasks', defaultChecked: true },
            { label: 'Push notifications', key: 'push', defaultChecked: true },
            { label: 'Daily digest email', key: 'dailyDigest', defaultChecked: false },
            { label: 'Weekly summary report', key: 'weeklyReport', defaultChecked: true },
            { label: 'AI agent completion alerts', key: 'aiAlerts', defaultChecked: true },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
              <input type="checkbox" defaultChecked={item.defaultChecked} className="rounded border-slate-300 text-primary-500 focus:ring-primary-500" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmailSubmissionSection() {
  const [domains, setDomains] = useState<ApprovedDomain[]>([
    { id: '1', domain: '@staples.com', isActive: true },
  ]);
  const [senders, setSenders] = useState<ApprovedSender[]>([
    { id: '1', email: 'mike@staples.com', isActive: true },
    { id: '2', email: 'warehouse@staples.com', isActive: true },
    { id: '3', email: 'warehouse2@staples.com', isActive: true },
    { id: '4', email: 'eperson@staples.com', isActive: false },
  ]);
  const [newDomain, setNewDomain] = useState('');
  const [newSender, setNewSender] = useState('');
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [submissionPrefix, setSubmissionPrefix] = useState('claimsubmission');
  const [companyDomain, setCompanyDomain] = useState('staples.freightclaims.com');

  function addDomain() {
    if (!newDomain.trim()) return;
    const domain = newDomain.startsWith('@') ? newDomain : `@${newDomain}`;
    setDomains([...domains, { id: Date.now().toString(), domain, isActive: true }]);
    setNewDomain('');
    toast.success('Domain added');
  }

  function addSender() {
    if (!newSender.trim()) return;
    setSenders([...senders, { id: Date.now().toString(), email: newSender, isActive: true }]);
    setNewSender('');
    toast.success('Sender added');
  }

  function toggleDomain(id: string) {
    setDomains(domains.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
  }

  function toggleSender(id: string) {
    setSenders(senders.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  }

  function removeDomain(id: string) {
    setDomains(domains.filter(d => d.id !== id));
    toast.success('Domain removed');
  }

  function removeSender(id: string) {
    setSenders(senders.filter(s => s.id !== id));
    toast.success('Sender removed');
  }

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
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Change Password</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
            <input type="password" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
            <input type="password" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
            <input type="password" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm" />
          </div>
          <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Update Password
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Two-Factor Authentication</h2>
        <p className="text-sm text-slate-500 mb-4">Add an extra layer of security to your account.</p>
        <button className="border border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Enable 2FA
        </button>
      </div>
    </div>
  );
}

function AppearanceSection() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Theme</h2>
        <div className="grid grid-cols-3 gap-3">
          {['Light', 'Dark', 'System'].map(theme => (
            <button
              key={theme}
              className={cn(
                'p-4 rounded-xl border text-center text-sm font-medium transition-all',
                theme === 'System'
                  ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-950 dark:text-primary-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
              )}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Density</h2>
        <div className="grid grid-cols-3 gap-3">
          {['Comfortable', 'Compact', 'Dense'].map(density => (
            <button
              key={density}
              className={cn(
                'p-4 rounded-xl border text-center text-sm font-medium transition-all',
                density === 'Comfortable'
                  ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-950 dark:text-primary-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
              )}
            >
              {density}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
