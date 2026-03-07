'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText, Building2, Truck, BarChart3,
  Bot, Settings, ChevronLeft, ChevronRight, X,
  Users, FolderOpen, Workflow, Sparkles, CheckSquare,
  FileSearch, Upload, Shield, Mail, Key,
  Layers, Package, TrendingUp, HelpCircle,
  ScrollText, Brain, ShieldAlert, Gavel, MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-tour';

const navItems = [
  { label: 'Claims', href: '/claims/list', icon: FileText },
  { label: 'Dashboard', href: '/claims', icon: BarChart3 },
  { label: 'AI Entry', href: '/ai-entry', icon: Sparkles },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Companies', href: '/companies', icon: Building2 },
  { label: 'Shipments', href: '/shipments', icon: Truck },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'Contracts', href: '/contracts', icon: ScrollText },
  { label: 'Reports', href: '/reports/export', icon: FileSearch },
  { label: 'AI Tools', href: '/ai', icon: Bot },
];

const companySubItems = [
  { label: 'All Companies', href: '/companies' },
  { label: 'Carriers', href: '/companies/carriers' },
  { label: 'Suppliers', href: '/companies/suppliers' },
  { label: 'Locations', href: '/companies/locations' },
  { label: 'Contacts', href: '/companies/contacts' },
  { label: 'Products', href: '/companies/products' },
];

const aiSubItems = [
  { label: 'AI Copilot', href: '/ai' },
  { label: 'Outcome Predictor', href: '/ai/predict' },
  { label: 'Carrier Risk Scoring', href: '/ai/risk' },
  { label: 'Fraud Detection', href: '/ai/fraud' },
  { label: 'Denial Response', href: '/ai/denial' },
  { label: 'Carrier Comms', href: '/ai/communication' },
  { label: 'Root Cause Analysis', href: '/ai/rootcause' },
];

const settingsSubItems = [
  { label: 'General', href: '/settings', adminOnly: false },
  { label: 'Users', href: '/settings/users', adminOnly: true },
  { label: 'Roles', href: '/settings/roles', adminOnly: true },
  { label: 'Templates', href: '/settings/templates', adminOnly: false },
  { label: 'API & Integrations', href: '/settings/api-setup', adminOnly: false },
  { label: 'Profile', href: '/settings/profile', adminOnly: false },
];

const bottomItems = [
  { label: 'Mass Upload', href: '/mass-upload', icon: Upload, adminOnly: false },
  { label: 'Automation', href: '/automation', icon: Workflow, adminOnly: true },
  { label: 'Claim Config', href: '/claims/settings', icon: Layers, adminOnly: false },
  { label: 'Help Center', href: '/help', icon: HelpCircle, adminOnly: false },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: false },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.isSuperAdmin || user?.permissions?.includes('settings.manage_users') || false;
  const [collapsed, setCollapsed] = useState(false);
  const [companiesExpanded, setCompaniesExpanded] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('fc-sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/companies')) setCompaniesExpanded(true);
    if (pathname.startsWith('/ai')) setAiExpanded(true);
    if (pathname.startsWith('/settings')) setSettingsExpanded(true);
  }, [pathname]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('fc-sidebar-collapsed', String(next));
  }

  function isActive(href: string) {
    if (href === '/claims/list') return pathname === '/claims/list' || (pathname.startsWith('/claims/') && !pathname.startsWith('/claims/settings') && pathname !== '/claims');
    if (href === '/claims') return pathname === '/claims';
    if (href === '/reports/export') return pathname === '/reports/export' || pathname.startsWith('/reports/new');
    if (href === '/companies') return pathname === '/companies' && !pathname.includes('/');
    if (href === '/ai') return pathname === '/ai' || pathname.startsWith('/ai/');
    return pathname === href || pathname.startsWith(href + '/');
  }

  function isExactActive(href: string) {
    return pathname === href;
  }

  const showFull = !collapsed || mobileOpen;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700">
        <Link href="/claims" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">FC</span>
          </div>
          {showFull && (
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              FreightClaims
            </span>
          )}
        </Link>
        {mobileOpen && onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const isCompanies = item.href === '/companies';
          const isAi = item.href === '/ai';

          return (
            <div key={item.href}>
              <div className="flex items-center">
                <Link
                  href={item.href}
                  onClick={() => {
                    onMobileClose?.();
                    if (isCompanies && showFull) setCompaniesExpanded(!companiesExpanded);
                    if (isAi && showFull) setAiExpanded(!aiExpanded);
                  }}
                  className={cn(
                    'flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    'active:scale-[0.98] touch-manipulation',
                    active
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                  )}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-primary-500')} />
                  {showFull && <span>{item.label}</span>}
                </Link>
              </div>

              {/* Companies Sub-Nav */}
              {isCompanies && showFull && companiesExpanded && (
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {companySubItems.map(sub => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onMobileClose}
                      className={cn(
                        'block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        isExactActive(sub.href)
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/5'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* AI Tools Sub-Nav */}
              {isAi && showFull && aiExpanded && (
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {aiSubItems.map(sub => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onMobileClose}
                      className={cn(
                        'block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        isExactActive(sub.href)
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/5'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {showFull && (
          <div className="pt-3 pb-1 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tools & Config</p>
          </div>
        )}
        {!showFull && <div className="pt-2 border-t border-slate-200 dark:border-slate-700 my-1" />}

        {bottomItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const isSettings = item.href === '/settings';

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => { onMobileClose?.(); if (isSettings && showFull) setSettingsExpanded(!settingsExpanded); }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'active:scale-[0.98] touch-manipulation',
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-primary-500')} />
                {showFull && <span>{item.label}</span>}
              </Link>

              {/* Settings Sub-Nav */}
              {isSettings && showFull && settingsExpanded && (
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {settingsSubItems.filter(sub => !sub.adminOnly || isAdmin).map(sub => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onMobileClose}
                      className={cn(
                        'block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        isExactActive(sub.href)
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/5'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Onboarding Checklist */}
      {showFull && (
        <div className="px-3 pb-3">
          <OnboardingChecklist />
        </div>
      )}

      {/* Collapse toggle */}
      <div className="px-2 pb-3 hidden lg:block">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
              <span className="ml-auto bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">v5.0</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={onMobileClose} aria-hidden />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200 flex-shrink-0',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
