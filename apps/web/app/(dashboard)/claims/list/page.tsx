'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { get } from '@/lib/api-client';
import { cn, getStatusBadgeClass } from '@/lib/utils';
import { formatCurrency, formatDate, CLAIM_STATUSES, CLAIM_TYPES } from 'shared';
import type { Claim, PaginatedResponse } from 'shared';
import {
  Search, Plus, Filter, Calendar, ChevronDown, Settings,
  AlertTriangle, Mail, CheckSquare,
} from 'lucide-react';

type ClaimCategory = 'not_filed' | 'filed' | 'closed' | 'all';

interface ClaimSidebarSection {
  label: string;
  categories: { key: ClaimCategory; label: string; count: number }[];
}

interface DashboardStats {
  total: number;
  pending: number;
  inReview: number;
  settled: number;
  deleted?: number;
}

function buildSidebarSections(stats: DashboardStats | undefined): ClaimSidebarSection[] {
  const s = stats ?? { total: 0, pending: 0, inReview: 0, settled: 0, deleted: 0 };
  const notFiled = s.pending;
  const filed = s.inReview;
  const closed = s.settled;
  const all = s.total;
  return [
    {
      label: 'My Claims',
      categories: [
        { key: 'not_filed', label: 'Not Filed', count: notFiled },
        { key: 'filed', label: 'Filed', count: filed },
        { key: 'closed', label: 'Closed', count: closed },
        { key: 'all', label: 'All Claims', count: all },
      ],
    },
    {
      label: 'ABC Logistics',
      categories: [
        { key: 'not_filed', label: 'Not Filed', count: notFiled },
        { key: 'filed', label: 'Filed', count: filed },
        { key: 'closed', label: 'Closed', count: closed },
        { key: 'all', label: 'All Claims', count: all },
      ],
    },
  ];
}

export default function ClaimsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeSection, setActiveSection] = useState(0);
  const [activeCategory, setActiveCategory] = useState<ClaimCategory>('filed');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [hasTasks, setHasTasks] = useState(false);
  const [hasOverdueTasks, setHasOverdueTasks] = useState(false);
  const [unreadEmails, setUnreadEmails] = useState(false);
  const [createdDate, setCreatedDate] = useState('');
  const [filedDate, setFiledDate] = useState('');
  const limit = 25;

  const { data: stats } = useQuery({
    queryKey: ['claims', 'dashboard-stats'],
    queryFn: () => get<DashboardStats>('/claims/dashboard/stats'),
  });

  const SIDEBAR_SECTIONS = useMemo(() => buildSidebarSections(stats), [stats]);
  const deletedCount = stats?.deleted ?? 0;

  const categoryStatusMap: Record<ClaimCategory, string> = {
    not_filed: 'pending',
    filed: 'in_review',
    closed: 'settled',
    all: '',
  };
  const effectiveStatus = statusFilter || categoryStatusMap[activeCategory];

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(effectiveStatus && { status: effectiveStatus }),
    ...(typeFilter && { claimType: typeFilter }),
    ...(hasTasks && { hasTasks: 'true' }),
    ...(hasOverdueTasks && { hasOverdueTasks: 'true' }),
    ...(unreadEmails && { unreadEmails: 'true' }),
    ...(createdDate && { dateFrom: createdDate }),
    ...(filedDate && { filedDateFrom: filedDate }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['claims', 'list', page, search, effectiveStatus, typeFilter, hasTasks, hasOverdueTasks, unreadEmails, createdDate, filedDate],
    queryFn: () => get<PaginatedResponse<Claim>>(`/claims?${queryParams.toString()}`),
  });

  const totalPages = data?.pagination?.totalPages || 1;
  const section = SIDEBAR_SECTIONS[activeSection];
  const categoryData = section?.categories.find(c => c.key === activeCategory);

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setHasTasks(false);
    setHasOverdueTasks(false);
    setUnreadEmails(false);
    setCreatedDate('');
    setFiledDate('');
    setPage(1);
  }

  const hasActiveFilters = hasTasks || hasOverdueTasks || unreadEmails || createdDate || filedDate;

  return (
    <div className="flex gap-6">
      {/* Claims Sidebar */}
      <div className="hidden lg:block w-48 flex-shrink-0">
        <div className="sticky top-6 space-y-4">
          {(SIDEBAR_SECTIONS || []).map((s, sIdx) => (
            <div key={s.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">{s.label}</p>
              <div className="space-y-0.5">
                {s.categories.map(cat => (
                  <button
                    key={`${sIdx}-${cat.key}`}
                    onClick={() => { setActiveSection(sIdx); setActiveCategory(cat.key); setPage(1); }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all',
                      activeSection === sIdx && activeCategory === cat.key
                        ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <span>{cat.label}</span>
                    <span className="text-xs font-medium">{cat.count}</span>
                  </button>
                ))}
              </div>
              {sIdx === 0 && (
                <button onClick={() => router.push('/claims/settings')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-2 px-1">
                  <Settings className="w-3 h-3" /> Claim Settings
                </button>
              )}
            </div>
          ))}
          <button onClick={() => router.push('/claims/list?deleted=true')} className="w-full flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-1">
            Deleted <span className="ml-auto text-xs">{deletedCount}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeCategory === 'filed' ? 'Filed Claims' : activeCategory === 'not_filed' ? 'Not Filed Claims' : activeCategory === 'closed' ? 'Closed Claims' : 'All Claims'}
            </h1>
          </div>
          <Link
            href="/claims/new"
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> New Claim
          </Link>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-slate-500">Claim Count</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{categoryData?.count || 0}</p>
            <p className="text-xs text-slate-400">0 Past 7 days</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Average Claim Age</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">188 <span className="text-lg font-normal text-slate-500">days</span></p>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setHasTasks(!hasTasks); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              hasTasks
                ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950 dark:border-primary-500/30 dark:text-primary-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            <CheckSquare className="w-3 h-3" /> Has Tasks
          </button>
          <button
            onClick={() => { setHasOverdueTasks(!hasOverdueTasks); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              hasOverdueTasks
                ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950 dark:border-primary-500/30 dark:text-primary-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            <AlertTriangle className="w-3 h-3" /> Has Overdue Tasks
          </button>
          <button
            onClick={() => { setUnreadEmails(!unreadEmails); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              unreadEmails
                ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950 dark:border-primary-500/30 dark:text-primary-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            <Mail className="w-3 h-3" /> Unread Emails
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Reset
            </button>
          )}
        </div>

        {/* Date Filters + More Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={createdDate}
              onChange={(e) => { setCreatedDate(e.target.value); setPage(1); }}
              className="pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              placeholder="Created Date"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filedDate}
              onChange={(e) => { setFiledDate(e.target.value); setPage(1); }}
              className="pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              placeholder="Filed Date"
            />
          </div>
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
              showMoreFilters
                ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950 dark:border-primary-500/30 dark:text-primary-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            <Filter className="w-4 h-4" /> More Filters <ChevronDown className={cn('w-3 h-3 transition-transform', showMoreFilters && 'rotate-180')} />
          </button>
        </div>

        {/* Extended filters panel */}
        {showMoreFilters && (
          <div className="card p-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search FreightClaims"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">All Statuses</option>
                {Object.entries(CLAIM_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">All Types</option>
                {Object.entries(CLAIM_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {activeCategory === 'filed' ? 'My Claims (Filed)' : section.label} &middot; {categoryData?.count || 0} claims
          </p>
          <button onClick={() => router.push('/claims')} className="text-xs text-primary-500 hover:text-primary-600 font-medium">Dashboard View</button>
        </div>

        {/* Claims table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Primary Identifier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Last Update</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Carrier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : data?.data?.length ? (
                  data.data.map((claim) => (
                    <tr
                      key={claim.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      onClick={() => router.push(`/claims/${claim.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-primary-500 font-medium hover:underline">{claim.claimNumber}</span>
                          {claim.proNumber && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5">{claim.proNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div>
                          <div className="text-sm">{claim.createdAt ? formatDate(claim.createdAt) : '-'}</div>
                          <div className="text-xs text-slate-400">
                            {claim.createdAt ? `${Math.floor((Date.now() - new Date(claim.createdAt).getTime()) / 86400000)} days ago` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div>
                          <div className="text-sm">{claim.updatedAt ? formatDate(claim.updatedAt) : '-'}</div>
                          <div className="text-xs text-slate-400">
                            {claim.updatedAt ? `${Math.floor((Date.now() - new Date(claim.updatedAt).getTime()) / 86400000)} days ago` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-sm text-slate-700 dark:text-slate-300">
                        {(claim as any).customerName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {(claim as any).carrierName || 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400 py-12">
                      No claims match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
