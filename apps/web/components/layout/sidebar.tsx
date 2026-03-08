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
  Crown,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-tour';

const navItems = [
  { label: 'Claims', href: '/claims/list', icon: FileText },
  { label: 'Dashboard', href: '/claims', icon: BarChart3 },
  { label: 'AI Entry', href: '/ai-entry', icon: Sparkles },
  { label: 'Insights', href: '/reports', icon: TrendingUp },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Companies', href: '/companies', icon: Building2 },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'Reports', href: '/reports/export', icon: FileSearch },
  { label: 'AI Tools', href: '/ai', icon: Bot },
];

const companySubItems = [
  { label: 'Customers', href: '/customers' },
  { label: 'Capacity Providers', href: '/companies/carriers' },
  { label: 'Insurance', href: '/companies/suppliers' },
  { label: 'All Companies', href: '/companies' },
  { label: 'All Contacts', href: '/companies/contacts' },
  { label: 'All Products', href: '/companies/products' },
  { label: 'All Locations', href: '/companies/locations' },
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

const adminItems = [
  { label: 'User Management', href: '/settings/users', icon: Users },
  { label: 'Roles & Permissions', href: '/settings/roles', icon: Shield },
];

const settingsSubItems = [
  { label: 'General', href: '/settings' },
  { label: 'Templates', href: '/settings/templates' },
  { label: 'API & Integrations', href: '/settings/api-setup' },
  { label: 'Profile', href: '/settings/profile' },
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
    if (href === '/reports') return pathname === '/reports';
    if (href === '/reports/export') return pathname === '/reports/export' || pathname.startsWith('/reports/new');
    if (href === '/companies') return pathname === '/companies' && !pathname.includes('/');
    if (href === '/ai') return pathname === '/ai' || pathname.startsWith('/ai/');
    return pathname === href || pathname.startsWith(href + '/');
  }

  function isExactActive(href: string) {
    return pathname === href;
  }

  const showFull = !collapsed || mobileOpen;

  const displayName = user?.corporateName || 'FreightClaims';
  const roleBadge = user?.isSuperAdmin
    ? 'Super Admin'
    : user?.roleName || 'User';

  const sidebarContent = (
    <>
      {/* Account Identity */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
        <Link href="/claims" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          {showFull && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {user?.isSuperAdmin && (
                  <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full truncate',
                  user?.isSuperAdmin
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                )}>
                  {roleBadge}
                </span>
              </div>
            </div>
          )}
        </Link>
        {mobileOpen && onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 absolute top-3 right-3" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Super Admin Indicator */}
      {user?.isSuperAdmin && showFull && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Admin Panel</span>
          </div>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 mt-0.5">Viewing all account data</p>
        </div>
      )}

      {/* Admin Top-Level Items */}
      {isAdmin && showFull && (
        <div className="px-2 pt-3 space-y-0.5">
          <div className="px-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Administration</p>
          </div>
          {adminItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'active:scale-[0.98] touch-manipulation',
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-primary-500')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
      {isAdmin && !showFull && (
        <div className="px-2 pt-2 space-y-0.5">
          {adminItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-center px-3 py-2.5 rounded-xl transition-all',
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
                title={item.label}
              >
                <Icon className={cn('w-5 h-5', active && 'text-primary-500')} />
              </Link>
            );
          })}
        </div>
      )}

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
                  {settingsSubItems.map(sub => (
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
