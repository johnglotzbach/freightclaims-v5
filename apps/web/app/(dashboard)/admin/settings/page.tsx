'use client';

import { useAuth } from '@/hooks/use-auth';
import { Crown, Settings, Globe, Shield, Database, Mail } from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const { user } = useAuth();

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Super Admin Access Required</h2>
          <p className="text-slate-500 mt-2">This page is only accessible to platform administrators.</p>
        </div>
      </div>
    );
  }

  const settingSections = [
    { label: 'General Settings', desc: 'Platform name, logo, defaults', icon: Settings, href: '/settings' },
    { label: 'Email Configuration', desc: 'SMTP settings, templates, notifications', icon: Mail, href: '/settings/templates' },
    { label: 'Roles & Permissions', desc: 'Global roles and permission definitions', icon: Shield, href: '/settings/roles' },
    { label: 'API & Integrations', desc: 'API keys, webhooks, third-party integrations', icon: Globe, href: '/settings/api-setup' },
    { label: 'Database', desc: 'Data management, export, cleanup', icon: Database, href: '/settings' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-amber-500" />
          Platform Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">Global platform configuration and administration</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {settingSections.map(s => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900 transition-colors">
                <s.icon className="w-5 h-5 text-slate-500 group-hover:text-primary-500 transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{s.label}</h3>
            </div>
            <p className="text-sm text-slate-500">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
