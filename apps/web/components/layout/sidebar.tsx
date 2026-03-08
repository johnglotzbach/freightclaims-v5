'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText, Building2, BarChart3,
  Bot, Settings, ChevronLeft, ChevronRight, X,
  Users, FolderOpen, Workflow, Sparkles, CheckSquare,
  FileSearch, Upload, Shield,
  Layers, TrendingUp, HelpCircle,
  Crown, Globe, CreditCard, UserPlus, Lock,
  LayoutDashboard, Mail,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-tour';

type NavItem = {
  label: string;
  href: string;
  icon: typeof FileText;
  permission?: string;
  children?: { label: string; href: string; permission?: string }[];
};

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
  { label: 'AI Copilot', href: '/ai', permission: 'ai.copilot' },
  { label: 'Outcome Predictor', href: '/ai/predict', permission: 'ai.agents' },
  { label: 'Carrier Risk Scoring', href: '/ai/risk', permission: 'ai.agents' },
  { label: 'Fraud Detection', href: '/ai/fraud', permission: 'ai.agents' },
  { label: 'Denial Response', href: '/ai/denial', permission: 'ai.agents' },
  { label: 'Carrier Comms', href: '/ai/communication', permission: 'ai.agents' },
  { label: 'Root Cause Analysis', href: '/ai/rootcause', permission: 'ai.agents' },
];

const settingsSubItems = [
  { label: 'General', href: '/settings' },
  { label: 'Templates', href: '/settings/templates', permission: 'email.templates' },
  { label: 'API & Integrations', href: '/settings/api-setup', permission: 'settings.manage' },
  { label: 'Profile', href: '/settings/profile' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const isSuperAdmin = user?.isSuperAdmin || false;
  const isWorkspaceAdmin = !isSuperAdmin && (
    hasPermission('users.manage') || hasPermission('settings.manage') || hasPermission('roles.manage')
  );

  useEffect(() => {
    const saved = localStorage.getItem('fc-sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/companies') || pathname.startsWith('/customers'))
      setExpandedSections(s => ({ ...s, companies: true }));
    if (pathname.startsWith('/ai'))
      setExpandedSections(s => ({ ...s, ai: true }));
    if (pathname.startsWith('/settings'))
      setExpandedSections(s => ({ ...s, settings: true }));
  }, [pathname]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('fc-sidebar-collapsed', String(next));
  }

  function toggleSection(key: string) {
    setExpandedSections(s => ({ ...s, [key]: !s[key] }));
  }

  function isActive(href: string) {
    if (href === '/claims/list') return pathname === '/claims/list' || (pathname.startsWith('/claims/') && !pathname.startsWith('/claims/settings') && pathname !== '/claims');
    if (href === '/claims') return pathname === '/claims';
    if (href === '/reports') return pathname === '/reports';
    if (href === '/reports/export') return pathname.startsWith('/reports/export') || pathname.startsWith('/reports/new');
    if (href === '/companies') return pathname === '/companies';
    if (href === '/ai') return pathname === '/ai' || pathname.startsWith('/ai/');
    return pathname === href || pathname.startsWith(href + '/');
  }

  function isExactActive(href: string) {
    return pathname === href;
  }

  const showFull = !collapsed || mobileOpen;

  const displayName = user?.corporateName || 'FreightClaims';
  const roleBadge = isSuperAdmin
    ? 'Super Admin'
    : isWorkspaceAdmin
      ? 'Workspace Admin'
      : user?.roleName || 'User';

  const mainNavItems = useMemo(() => {
    const items: NavItem[] = [];

    if (hasPermission('claims.view') || isSuperAdmin) {
      items.push({ label: 'Claims', href: '/claims/list', icon: FileText });
      items.push({ label: 'Dashboard', href: '/claims', icon: BarChart3 });
    }

    if (hasPermission('claims.create') || isSuperAdmin) {
      items.push({ label: 'AI Entry', href: '/ai-entry', icon: Sparkles });
    }

    if (hasPermission('reports.view') || isSuperAdmin) {
      items.push({ label: 'Insights', href: '/reports', icon: TrendingUp });
    }

    if (hasPermission('claims.view') || isSuperAdmin) {
      items.push({ label: 'Tasks', href: '/tasks', icon: CheckSquare });
    }

    if (hasPermission('customers.view') || isSuperAdmin) {
      items.push({
        label: 'Companies',
        href: '/companies',
        icon: Building2,
        children: companySubItems,
      });
    }

    if (hasPermission('documents.view') || isSuperAdmin) {
      items.push({ label: 'Documents', href: '/documents', icon: FolderOpen });
    }

    if (hasPermission('reports.export') || isSuperAdmin) {
      items.push({ label: 'Reports', href: '/reports/export', icon: FileSearch });
    }

    if (hasPermission('ai.copilot') || hasPermission('ai.agents') || isSuperAdmin) {
      items.push({
        label: 'AI Tools',
        href: '/ai',
        icon: Bot,
        children: aiSubItems.filter(sub =>
          isSuperAdmin || !sub.permission || hasPermission(sub.permission)
        ),
      });
    }

    return items;
  }, [user, isSuperAdmin, hasPermission]);

  const toolItems = useMemo(() => {
    const items: NavItem[] = [];

    if (hasPermission('documents.upload') || isSuperAdmin) {
      items.push({ label: 'Mass Upload', href: '/mass-upload', icon: Upload });
    }

    if (hasPermission('automation.manage') || isSuperAdmin) {
      items.push({ label: 'Automation', href: '/automation', icon: Workflow });
    }

    if (hasPermission('settings.view') || isSuperAdmin) {
      items.push({ label: 'Claim Config', href: '/claims/settings', icon: Layers });
    }

    items.push({ label: 'Help Center', href: '/help', icon: HelpCircle });

    items.push({
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      children: settingsSubItems.filter(sub =>
        isSuperAdmin || !sub.permission || hasPermission(sub.permission)
      ),
    });

    return items;
  }, [user, isSuperAdmin, hasPermission]);

  function renderNavLink(item: NavItem, isChild = false) {
    const active = isChild ? isExactActive(item.href) : isActive(item.href);
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const sectionKey = item.label.toLowerCase().replace(/\s+/g, '');
    const isExpanded = expandedSections[sectionKey];

    return (
      <div key={item.href}>
        <Link
          href={item.href}
          onClick={() => {
            onMobileClose?.();
            if (hasChildren && showFull) toggleSection(sectionKey);
          }}
          className={cn(
            'flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-all',
            'active:scale-[0.98] touch-manipulation',
            isChild ? 'py-1.5 text-xs ml-8' : 'py-2.5',
            active
              ? isChild
                ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/5'
                : 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
              : isChild
                ? 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
          )}
        >
          {!isChild && <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-primary-500')} />}
          {showFull && <span>{item.label}</span>}
        </Link>

        {hasChildren && showFull && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map(sub => (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onMobileClose}
                className={cn(
                  'block px-3 py-1.5 ml-8 rounded-lg text-xs font-medium transition-colors',
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
  }

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
                {isSuperAdmin && (
                  <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full truncate',
                  isSuperAdmin
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : isWorkspaceAdmin
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
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

      {/* Super Admin Platform Management */}
      {isSuperAdmin && showFull && (
        <div className="px-2 pt-3 space-y-0.5">
          <div className="mx-1 mb-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Platform Admin</span>
            </div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 mt-0.5">Full platform access</p>
          </div>
          <div className="px-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Platform Management</p>
          </div>
          {[
            { label: 'All Workspaces', href: '/admin/workspaces', icon: Globe },
            { label: 'All Users', href: '/admin/users', icon: Users },
            { label: 'Billing & Plans', href: '/admin/billing', icon: CreditCard },
            { label: 'Platform Settings', href: '/admin/settings', icon: Settings },
          ].map(item => {
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
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-amber-500')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
      {isSuperAdmin && !showFull && (
        <div className="px-2 pt-2 space-y-0.5">
          {[
            { label: 'All Workspaces', href: '/admin/workspaces', icon: Globe },
            { label: 'All Users', href: '/admin/users', icon: Users },
          ].map(item => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-center px-3 py-2.5 rounded-xl transition-all',
                  active
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
                title={item.label}
              >
                <Icon className={cn('w-5 h-5', active && 'text-amber-500')} />
              </Link>
            );
          })}
        </div>
      )}

      {/* Workspace Admin Section */}
      {isWorkspaceAdmin && !isSuperAdmin && showFull && (
        <div className="px-2 pt-3 space-y-0.5">
          <div className="mx-1 mb-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Workspace</span>
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/60 mt-0.5">{displayName}</p>
          </div>
          <div className="px-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">My Workspace</p>
          </div>
          {[
            { label: 'Team Members', href: '/workspace/members', icon: UserPlus },
            { label: 'Roles & Permissions', href: '/workspace/roles', icon: Lock },
            { label: 'Billing', href: '/workspace/billing', icon: CreditCard },
          ].map(item => {
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
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-emerald-500')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Primary Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {showFull && (
          <div className="px-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Main</p>
          </div>
        )}

        {mainNavItems.map(item => renderNavLink(item))}

        {toolItems.length > 0 && (
          <>
            {showFull && (
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tools & Config</p>
              </div>
            )}
            {!showFull && <div className="pt-2 border-t border-slate-200 dark:border-slate-700 my-1" />}
            {toolItems.map(item => renderNavLink(item))}
          </>
        )}
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
