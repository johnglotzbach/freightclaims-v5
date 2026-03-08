'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText, Building2, BarChart3,
  Bot, Settings, ChevronLeft, ChevronRight, ChevronDown, X,
  Users, FolderOpen, Workflow, Sparkles, CheckSquare,
  FileSearch, Upload, Shield,
  Layers, TrendingUp, HelpCircle,
  Crown, Globe, CreditCard, UserPlus, Lock,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-tour';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isSuperAdmin = user?.isSuperAdmin || false;
  const isWorkspaceAdmin = !isSuperAdmin && (
    hasPermission('users.manage') || hasPermission('settings.manage') || hasPermission('roles.manage')
  );
  const canManageTeam = isSuperAdmin || isWorkspaceAdmin;
  const showFull = !collapsed || mobileOpen;

  useEffect(() => {
    const saved = localStorage.getItem('fc-sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/companies') || pathname.startsWith('/customers')) toggle('companies', true);
    if (pathname.startsWith('/ai')) toggle('ai', true);
    if (pathname.startsWith('/manage') || pathname.startsWith('/settings') || pathname.startsWith('/workspace')) toggle('manage', true);
    if (pathname.startsWith('/admin')) toggle('platform', true);
  }, [pathname]);

  function toggle(key: string, force?: boolean) {
    setExpanded(s => ({ ...s, [key]: force !== undefined ? force : !s[key] }));
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
  function isExact(href: string) { return pathname === href; }

  const displayName = user?.corporateName || 'FreightClaims';
  const roleBadge = isSuperAdmin ? 'Super Admin' : isWorkspaceAdmin ? 'Admin' : user?.roleName || 'User';
  const badgeColor = isSuperAdmin
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    : isWorkspaceAdmin
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
      : 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400';

  function NavLink({ href, icon: Icon, label, indent, amber }: { href: string; icon: typeof FileText; label: string; indent?: boolean; amber?: boolean }) {
    const active = indent ? isExact(href) : isActive(href);
    return (
      <Link
        href={href}
        onClick={onMobileClose}
        className={cn(
          'flex items-center gap-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]',
          indent ? 'px-3 py-1.5 ml-8 text-xs' : 'px-3 py-2',
          active
            ? indent
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50/60 dark:bg-primary-500/5'
              : amber
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shadow-sm'
                : 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
            : indent
              ? 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
        )}
      >
        {!indent && <Icon className={cn('w-[18px] h-[18px] flex-shrink-0', active && (amber ? 'text-amber-500' : 'text-primary-500'))} />}
        {showFull && <span>{label}</span>}
      </Link>
    );
  }

  function SectionHeader({ label }: { label: string }) {
    if (!showFull) return <div className="pt-2 border-t border-slate-200 dark:border-slate-700 my-1 mx-2" />;
    return <div className="px-3 pt-4 pb-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p></div>;
  }

  function Expandable({ sectionKey, icon: Icon, label, children, amber }: { sectionKey: string; icon: typeof FileText; label: string; children: React.ReactNode; amber?: boolean }) {
    const isExp = expanded[sectionKey];
    const active = isActive(
      sectionKey === 'companies' ? '/companies'
        : sectionKey === 'ai' ? '/ai'
        : sectionKey === 'manage' ? '/workspace'
        : sectionKey === 'platform' ? '/admin'
        : '/__none__'
    );
    return (
      <div>
        <button
          onClick={() => toggle(sectionKey)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98]',
            active
              ? amber ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shadow-sm' : 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
          )}
        >
          <Icon className={cn('w-[18px] h-[18px] flex-shrink-0', active && (amber ? 'text-amber-500' : 'text-primary-500'))} />
          {showFull && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', isExp && 'rotate-180')} />
            </>
          )}
        </button>
        {showFull && isExp && <div className="mt-0.5 space-y-0.5">{children}</div>}
      </div>
    );
  }

  const sidebarContent = (
    <>
      {/* ── Identity ── */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 relative">
        <Link href="/claims" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">{displayName.slice(0, 2).toUpperCase()}</span>
          </div>
          {showFull && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isSuperAdmin && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full truncate', badgeColor)}>{roleBadge}</span>
              </div>
            </div>
          )}
        </Link>
        {mobileOpen && onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 absolute top-3 right-3" aria-label="Close menu"><X className="w-5 h-5" /></button>
        )}
      </div>

      {/* ── Super Admin Platform Banner ── */}
      {isSuperAdmin && showFull && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Platform Admin</span>
          </div>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 mt-0.5">Full platform access · All workspaces</p>
        </div>
      )}

      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">

        {/* ── PLATFORM (Super Admin only) ── */}
        {isSuperAdmin && (
          <>
            <SectionHeader label="Platform" />
            <Expandable sectionKey="platform" icon={Globe} label="Platform Admin" amber>
              <NavLink href="/admin/workspaces" icon={Building2} label="All Workspaces" indent />
              <NavLink href="/admin/users" icon={Users} label="All Users" indent />
              <NavLink href="/admin/billing" icon={CreditCard} label="Billing & Plans" indent />
              <NavLink href="/admin/settings" icon={Settings} label="Platform Settings" indent />
            </Expandable>
          </>
        )}

        {/* ── WORK ── */}
        <SectionHeader label="Work" />
        {(isSuperAdmin || hasPermission('claims.view')) && (
          <>
            <NavLink href="/claims/list" icon={FileText} label="Claims" />
            <NavLink href="/claims" icon={BarChart3} label="Dashboard" />
          </>
        )}
        {(isSuperAdmin || hasPermission('claims.create')) && (
          <NavLink href="/ai-entry" icon={Sparkles} label="AI Entry" />
        )}
        {(isSuperAdmin || hasPermission('claims.view')) && (
          <NavLink href="/tasks" icon={CheckSquare} label="Tasks" />
        )}

        {/* ── DATA ── */}
        <SectionHeader label="Data" />
        {(isSuperAdmin || hasPermission('customers.view')) && (
          <Expandable sectionKey="companies" icon={Building2} label="Companies">
            <NavLink href="/customers" icon={Building2} label="Customers" indent />
            <NavLink href="/companies/carriers" icon={Building2} label="Capacity Providers" indent />
            <NavLink href="/companies/suppliers" icon={Building2} label="Insurance" indent />
            <NavLink href="/companies" icon={Building2} label="All Companies" indent />
            <NavLink href="/companies/contacts" icon={Building2} label="All Contacts" indent />
            <NavLink href="/companies/products" icon={Building2} label="All Products" indent />
            <NavLink href="/companies/locations" icon={Building2} label="All Locations" indent />
          </Expandable>
        )}
        {(isSuperAdmin || hasPermission('documents.view')) && (
          <NavLink href="/documents" icon={FolderOpen} label="Documents" />
        )}
        {(isSuperAdmin || hasPermission('reports.view')) && (
          <NavLink href="/reports" icon={TrendingUp} label="Insights" />
        )}
        {(isSuperAdmin || hasPermission('reports.export')) && (
          <NavLink href="/reports/export" icon={FileSearch} label="Reports" />
        )}

        {/* ── TOOLS ── */}
        {(isSuperAdmin || hasPermission('ai.copilot') || hasPermission('ai.agents')) && (
          <>
            <SectionHeader label="Tools" />
            <Expandable sectionKey="ai" icon={Bot} label="AI Tools">
              <NavLink href="/ai" icon={Bot} label="AI Copilot" indent />
              <NavLink href="/ai/predict" icon={Bot} label="Outcome Predictor" indent />
              <NavLink href="/ai/risk" icon={Bot} label="Carrier Risk Scoring" indent />
              <NavLink href="/ai/fraud" icon={Bot} label="Fraud Detection" indent />
              <NavLink href="/ai/denial" icon={Bot} label="Denial Response" indent />
              <NavLink href="/ai/communication" icon={Bot} label="Carrier Comms" indent />
              <NavLink href="/ai/rootcause" icon={Bot} label="Root Cause Analysis" indent />
            </Expandable>
          </>
        )}
        {(isSuperAdmin || hasPermission('documents.upload')) && (
          <NavLink href="/mass-upload" icon={Upload} label="Mass Upload" />
        )}
        {(isSuperAdmin || hasPermission('automation.manage')) && (
          <NavLink href="/automation" icon={Workflow} label="Automation" />
        )}
        {(isSuperAdmin || hasPermission('settings.view')) && (
          <NavLink href="/claims/settings" icon={Layers} label="Claim Config" />
        )}

        {/* ── MANAGEMENT (consolidated) ── */}
        {canManageTeam && (
          <>
            <SectionHeader label="Management" />
            <Expandable sectionKey="manage" icon={LayoutDashboard} label="Management">
              <NavLink href="/workspace/members" icon={UserPlus} label="Team Members" indent />
              <NavLink href="/workspace/roles" icon={Lock} label="Roles & Permissions" indent />
              <NavLink href="/workspace/billing" icon={CreditCard} label="Billing" indent />
              <NavLink href="/settings" icon={Settings} label="General Settings" indent />
              <NavLink href="/settings/templates" icon={Settings} label="Templates" indent />
              <NavLink href="/settings/api-setup" icon={Settings} label="API & Integrations" indent />
              <NavLink href="/settings/profile" icon={Settings} label="My Profile" indent />
            </Expandable>
          </>
        )}

        {/* Non-admin users still get Settings & Profile */}
        {!canManageTeam && (
          <>
            <SectionHeader label="Account" />
            <NavLink href="/settings" icon={Settings} label="Settings" />
            <NavLink href="/settings/profile" icon={Settings} label="My Profile" />
          </>
        )}

        <NavLink href="/help" icon={HelpCircle} label="Help Center" />
      </nav>

      {/* ── Onboarding ── */}
      {showFull && (
        <div className="px-3 pb-3">
          <OnboardingChecklist />
        </div>
      )}

      {/* ── Collapse ── */}
      <div className="px-2 pb-3 hidden lg:block">
        <button
          onClick={() => { const next = !collapsed; setCollapsed(next); localStorage.setItem('fc-sidebar-collapsed', String(next)); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4 mx-auto" /> : (
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
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={onMobileClose} aria-hidden />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-out lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>{sidebarContent}</aside>
      <aside className={cn('hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200 flex-shrink-0', collapsed ? 'w-[68px]' : 'w-64')}>{sidebarContent}</aside>
    </>
  );
}
