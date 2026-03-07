'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  User, Bell, Lock, Palette, Save, Camera,
  Mail, Phone, Shield, Clock, FileText, ToggleLeft, ToggleRight,
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
  const [firstName, setFirstName] = useState('Jordan');
  const [lastName, setLastName] = useState('Glotzer');
  const [email, setEmail] = useState('jordan@freightclaims.com');
  const [phone, setPhone] = useState('(555) 123-4567');
  const [timezone, setTimezone] = useState('America/New_York');

  return (
    <div className="card p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl font-bold text-primary-600">JG</div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg"><Camera className="w-3.5 h-3.5" /></button>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Jordan Glotzer</h3>
          <p className="text-xs text-slate-500">Administrator</p>
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
      <button onClick={() => toast.success('Profile updated')} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Save Changes</button>
    </div>
  );
}

function NotificationsTab() {
  const categories = [
    { label: 'Claim Updates', items: [
      { key: 'claim_created', label: 'New claim created', email: true, push: true, inApp: true },
      { key: 'claim_filed', label: 'Claim filed', email: true, push: true, inApp: true },
      { key: 'claim_settled', label: 'Claim settled', email: true, push: false, inApp: true },
      { key: 'claim_status_changed', label: 'Status changed', email: false, push: true, inApp: true },
      { key: 'claim_assigned', label: 'Claim assigned to me', email: true, push: true, inApp: true },
    ]},
    { label: 'Tasks', items: [
      { key: 'task_assigned', label: 'Task assigned to me', email: true, push: true, inApp: true },
      { key: 'task_due', label: 'Task due reminder', email: true, push: true, inApp: true },
      { key: 'task_overdue', label: 'Task overdue', email: true, push: true, inApp: true },
      { key: 'task_completed', label: 'Task completed', email: false, push: false, inApp: true },
    ]},
    { label: 'Emails & Documents', items: [
      { key: 'email_received', label: 'New email received', email: true, push: true, inApp: true },
      { key: 'document_uploaded', label: 'Document uploaded', email: false, push: false, inApp: true },
      { key: 'document_processed', label: 'AI document processed', email: false, push: true, inApp: true },
    ]},
    { label: 'Comments', items: [
      { key: 'comment_added', label: 'Comment added', email: false, push: true, inApp: true },
      { key: 'comment_mention', label: 'Mentioned in comment', email: true, push: true, inApp: true },
    ]},
    { label: 'Automation', items: [
      { key: 'automation_triggered', label: 'Automation triggered', email: false, push: false, inApp: true },
      { key: 'stagnant_claim', label: 'Stagnant claim alert', email: true, push: true, inApp: true },
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
            {cat.items.map(item => (
              <div key={item.key} className="flex items-center gap-4 py-2">
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                {['email', 'push', 'inApp'].map(channel => (
                  <div key={channel} className="w-16 flex justify-center">
                    <input type="checkbox" defaultChecked={(item as any)[channel]} className="rounded border-slate-300 text-primary-500 w-4 h-4" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => toast.success('Notification preferences saved')} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"><Save className="w-4 h-4 inline mr-1" /> Save Preferences</button>
    </div>
  );
}

function SignatureTab() {
  const [signature, setSignature] = useState('<p>Best regards,</p><p><strong>Jordan Glotzer</strong><br/>Lead Developer<br/>FreightClaims<br/>jordan@freightclaims.com</p>');

  return (
    <div className="card p-6 space-y-4 max-w-2xl">
      <h3 className="font-semibold text-slate-900 dark:text-white">Email Signature</h3>
      <p className="text-xs text-slate-500">This signature will be appended to all outgoing emails from your account</p>
      <textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={8} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono resize-none" />
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <p className="text-xs text-slate-500 mb-2">Preview</p>
        <div className="text-sm" dangerouslySetInnerHTML={{ __html: signature }} />
      </div>
      <button onClick={() => toast.success('Signature saved')} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"><Save className="w-4 h-4 inline mr-1" /> Save Signature</button>
    </div>
  );
}

function DashboardTab() {
  const [defaultView, setDefaultView] = useState('claims');
  const [claimsPerPage, setClaimsPerPage] = useState(25);
  const [defaultDateRange, setDefaultDateRange] = useState('30');

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
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary-500 w-3.5 h-3.5" /> {col}
          </label>
        ))}
      </div>
      <button onClick={() => toast.success('Dashboard settings saved')} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"><Save className="w-4 h-4 inline mr-1" /> Save Settings</button>
    </div>
  );
}
