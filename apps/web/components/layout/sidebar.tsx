'use client';

import { useState, useEffect } from 'react';
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
  LayoutDashboard, Truck, MapPin, Package, ShieldCheck,
  FileSpreadsheet, Contact, Ship,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-tour';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavLinkProps {
  href: string;
  icon: typeof FileText;
  label: string;
  indent?: boolean;
  amber?: boolean;
  pathname: string;
  showFull: boolean;
  onMobileClose?: () => void;
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/claims/list') return pathname === '/claims/list' || (pathname.startsWith('/claims/') && !pathname.startsWith('/claims/settings') && pathname !== '/claims');
  if (href === '/claims') return pathname === '/claims';
  if (href === '/reports') return pathname === '/reports';
  if (href === '/reports/export') return pathname.startsWith('/reports/export') || pathname.startsWith('/reports/new');
  if (href === '/companies') return pathname === '/companies';
  if (href === '/ai') return pathname === '/ai' || pathname.startsWith('/ai/');
  return pathname === href || pathname.startsWith(href + '/');
}

function SidebarNavLink({ href, icon: Icon, label, indent, amber, pathname, showFull, onMobileClose }: NavLinkProps) {
  const active = indent ? pathname === href : isActivePath(pathname, href);
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

function SidebarSectionHeader({ label, showFull }: { label: string; showFull: boolean }) {
  if (!showFull) return <div className="pt-2 border-t border-slate-200 dark:border-slate-700 my-1 mx-2" />;
  return <div className="px-3 pt-4 pb-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p></div>;
}

interface ExpandableProps {
  sectionKey: string;
  icon: typeof FileText;
  label: string;
  children: React.ReactNode;
  amber?: boolean;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  pathname: string;
  showFull: boolean;
}

function SidebarExpandable({ sectionKey, icon: Icon, label, children, amber, expanded, onToggle, pathname, showFull }: ExpandableProps) {
  const isExp = expanded[sectionKey];
  const sectionPath =
    sectionKey === 'companies' ? '/companies'
      : sectionKey === 'ai' ? '/ai'
      : sectionKey === 'manage' ? '/workspace'
      : sectionKey === 'platform' ? '/admin'
      : '/__none__';
  const active = isActivePath(pathname, sectionPath);
  return (
    <div>
      <button
        onClick={() => onToggle(sectionKey)}
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
    if (isSuperAdmin && pathname.startsWith('/admin')) toggle('platform', true);
  }, [pathname]);

  const toggle = (key: string, force?: boolean) => {
    setExpanded(s => ({ ...s, [key]: force !== undefined ? force : !s[key] }));
  };

  const displayName = user?.corporateName || 'FreightClaims';
  const roleBadge = isSuperAdmin ? 'Owner' : isWorkspaceAdmin ? 'Admin' : user?.roleName || 'User';
  const badgeColor = isSuperAdmin
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    : isWorkspaceAdmin
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
      : 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400';

  const linkProps = { pathname, showFull, onMobileClose };

  const sidebarContent = (
    <>
      {/* Identity */}
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

      {/* Super Admin Platform Banner */}
      {isSuperAdmin && showFull && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Platform Admin</span>
          </div>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 mt-0.5">Full platform access &middot; All workspaces</p>
        </div>
      )}

      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">

        {/* PLATFORM (Super Admin only) */}
        {isSuperAdmin && (
          <>
            <SidebarSectionHeader label="Platform" showFull={showFull} />
            <SidebarNavLink href="/admin" icon={Crown} label="Overview" amber {...linkProps} />
            <SidebarExpandable sectionKey="platform" icon={Globe} label="Manage" amber expanded={expanded} onToggle={toggle} pathname={pathname} showFull={showFull}>
              <SidebarNavLink href="/admin/workspaces" icon={Building2} label="Workspaces & Teams" indent {...linkProps} />
              <SidebarNavLink href="/admin/users" icon={Users} label="All Users" indent {...linkProps} />
              <SidebarNavLink href="/admin/billing" icon={CreditCard} label="Billing & Plans" indent {...linkProps} />
              <SidebarNavLink href="/admin/settings" icon={Settings} label="Platform Settings" indent {...linkProps} />
            </SidebarExpandable>
          </>
        )}

        {/* WORK */}
        <SidebarSectionHeader label="Work" showFull={showFull} />
        {(isSuperAdmin || hasPermission('claims.view')) && (
          <>
            <SidebarNavLink href="/claims/list" icon={FileText} label="Claims" {...linkProps} />
            <SidebarNavLink href="/claims" icon={BarChart3} label="Dashboard" {...linkProps} />
          </>
        )}
        {(isSuperAdmin || hasPermission('claims.create')) && (
          <SidebarNavLink href="/ai-entry" icon={Sparkles} label="AI Entry" {...linkProps} />
        )}
        {(isSuperAdmin || hasPermission('claims.view')) && (
          <SidebarNavLink href="/tasks" icon={CheckSquare} label="Tasks" {...linkProps} />
        )}

        {/* DATA */}
        <SidebarSectionHeader label="Data" showFull={showFull} />
        {(isSuperAdmin || hasPermission('customers.view')) && (
          <SidebarExpandable sectionKey="companies" icon={Building2} label="Companies" expanded={expanded} onToggle={toggle} pathname={pathname} showFull={showFull}>
            <SidebarNavLink href="/customers" icon={Building2} label="Customers" indent {...linkProps} />
            <SidebarNavLink href="/companies/carriers" icon={Truck} label="Carriers" indent {...linkProps} />
            <SidebarNavLink href="/companies/suppliers" icon={Package} label="Suppliers" indent {...linkProps} />
            <SidebarNavLink href="/companies/contacts" icon={Contact} label="Contacts" indent {...linkProps} />
            <SidebarNavLink href="/companies/locations" icon={MapPin} label="Locations" indent {...linkProps} />
            <SidebarNavLink href="/companies/products" icon={Layers} label="Products" indent {...linkProps} />
          </SidebarExpandable>
        )}
        <SidebarNavLink href="/shipments" icon={Ship} label="Shipments" {...linkProps} />
        <SidebarNavLink href="/contracts" icon={FileSpreadsheet} label="Contracts" {...linkProps} />
        {(isSuperAdmin || hasPermission('documents.view')) && (
          <SidebarNavLink href="/documents" icon={FolderOpen} label="Documents" {...linkProps} />
        )}
        {(isSuperAdmin || hasPermission('reports.view')) && (
          <SidebarNavLink href="/reports" icon={TrendingUp} label="Insights" {...linkProps} />
        )}
        {(isSuperAdmin || hasPermission('reports.export')) && (
          <SidebarNavLink href="/reports/export" icon={FileSearch} label="Reports" {...linkProps} />
        )}

        {/* TOOLS */}
        {(isSuperAdmin || hasPermission('ai.copilot') || hasPermission('ai.agents')) && (
          <>
            <SidebarSectionHeader label="Tools" showFull={showFull} />
            <SidebarExpandable sectionKey="ai" icon={Bot} label="AI Tools" expanded={expanded} onToggle={toggle} pathname={pathname} showFull={showFull}>
              <SidebarNavLink href="/ai" icon={Bot} label="AI Copilot" indent {...linkProps} />
              <SidebarNavLink href="/ai/predict" icon={Bot} label="Outcome Predictor" indent {...linkProps} />
              <SidebarNavLink href="/ai/risk" icon={Bot} label="Carrier Risk Scoring" indent {...linkProps} />
              <SidebarNavLink href="/ai/fraud" icon={Bot} label="Fraud Detection" indent {...linkProps} />
              <SidebarNavLink href="/ai/denial" icon={Bot} label="Denial Response" indent {...linkProps} />
              <SidebarNavLink href="/ai/communication" icon={Bot} label="Carrier Comms" indent {...linkProps} />
              <SidebarNavLink href="/ai/rootcause" icon={Bot} label="Root Cause Analysis" indent {...linkProps} />
            </SidebarExpandable>
          </>
        )}
        {(isSuperAdmin || hasPermission('documents.upload')) && (
          <SidebarNavLink href="/mass-upload" icon={Upload} label="Mass Upload" {...linkProps} />
        )}
        {(isSuperAdmin || hasPermission('automation.manage')) && (
          <SidebarNavLink href="/automation" icon={Workflow} label="Automation" {...linkProps} />
        )}
        {(isSuperAdmin || hasPermission('settings.view')) && (
          <SidebarNavLink href="/claims/settings" icon={Layers} label="Claim Config" {...linkProps} />
        )}

        {/* MANAGEMENT (consolidated) */}
        {canManageTeam && (
          <>
            <SidebarSectionHeader label="Management" showFull={showFull} />
            <SidebarExpandable sectionKey="manage" icon={LayoutDashboard} label="Management" expanded={expanded} onToggle={toggle} pathname={pathname} showFull={showFull}>
              <SidebarNavLink href="/workspace/members" icon={UserPlus} label="Team Members" indent {...linkProps} />
              <SidebarNavLink href="/workspace/roles" icon={Lock} label="Roles & Permissions" indent {...linkProps} />
              <SidebarNavLink href="/workspace/billing" icon={CreditCard} label="Billing" indent {...linkProps} />
              <SidebarNavLink href="/settings" icon={Settings} label="General Settings" indent {...linkProps} />
              <SidebarNavLink href="/settings/templates" icon={Settings} label="Templates" indent {...linkProps} />
              <SidebarNavLink href="/settings/api-setup" icon={Settings} label="API & Integrations" indent {...linkProps} />
              <SidebarNavLink href="/settings/profile" icon={Settings} label="My Profile" indent {...linkProps} />
            </SidebarExpandable>
          </>
        )}

        {/* Non-admin users still get Settings & Profile */}
        {!canManageTeam && (
          <>
            <SidebarSectionHeader label="Account" showFull={showFull} />
            <SidebarNavLink href="/settings" icon={Settings} label="Settings" {...linkProps} />
            <SidebarNavLink href="/settings/profile" icon={Settings} label="My Profile" {...linkProps} />
          </>
        )}

        <SidebarNavLink href="/help" icon={HelpCircle} label="Help Center" {...linkProps} />
      </nav>

      {/* Onboarding */}
      {showFull && (
        <div className="px-3 pb-3">
          <OnboardingChecklist />
        </div>
      )}

      {/* Collapse */}
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
