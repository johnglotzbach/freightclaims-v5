'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { get, getList, put, del, apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, CLAIM_TYPES } from 'shared';
import type { Claim, PaginatedResponse } from 'shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, Plus, X, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown,
  BarChart3, Clock, TrendingUp, AlertCircle,
  Download, Trash2, RefreshCw,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   Status configuration
   ──────────────────────────────────────────────────────────── */

const STATUS_TABS = [
  { key: '',          label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'filed',     label: 'Filed' },
  { key: 'in_review', label: 'In Review' },
  { key: 'settled',   label: 'Settled' },
  { key: 'declined',  label: 'Declined' },
  { key: 'deleted',   label: 'Deleted' },
] as const;

const STATUS_PILL: Record<string, string> = {
  pending:        'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
  filed:          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_review:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  settled:        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  declined:       'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  denied:         'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  deleted:        'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
  draft:          'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  approved:       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  appealed:       'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  in_negotiation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  closed:         'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
  cancelled:      'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', filed: 'Filed', in_review: 'In Review',
  settled: 'Settled', declined: 'Declined', denied: 'Denied',
  deleted: 'Deleted', draft: 'Draft', approved: 'Approved',
  appealed: 'Appealed', in_negotiation: 'In Negotiation',
  closed: 'Closed', cancelled: 'Cancelled',
};

/* ────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────── */

interface DashboardStats {
  total: number;
  pending: number;
  inReview: number;
  settled: number;
  deleted?: number;
  filed?: number;
  declined?: number;
}

interface CarrierOption { id: string; name: string }

type SortField = 'claimNumber' | 'status' | 'claimAmount' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

/* ────────────────────────────────────────────────────────────
   Debounce hook
   ──────────────────────────────────────────────────────────── */

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/* ────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */

export default function ClaimsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  /* ── State ── */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('status') ?? '');
  const [claimType, setClaimType] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { setPage(1); }, [debouncedSearch, activeTab, claimType, carrierId, dateFrom, dateTo]);
  useEffect(() => { setSelectedIds(new Set()); }, [page, activeTab]);

  /* ── Query string builder ── */
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (activeTab) p.set('status', activeTab);
    if (claimType) p.set('claimType', claimType);
    if (carrierId) p.set('carrierId', carrierId);
    if (sortBy) p.set('sortBy', sortBy);
    if (sortOrder) p.set('sortOrder', sortOrder);
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    return p.toString();
  }, [page, limit, debouncedSearch, activeTab, claimType, carrierId, sortBy, sortOrder, dateFrom, dateTo]);

  /* ── Queries ── */
  const { data: stats } = useQuery({
    queryKey: ['claims', 'dashboard-stats'],
    queryFn: () => get<DashboardStats>('/claims/dashboard/stats'),
    staleTime: 30_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['claims', 'list', queryString],
    queryFn: () => get<PaginatedResponse<Claim>>(`/claims?${queryString}`),
    staleTime: 30_000,
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers', 'list'],
    queryFn: () => getList<CarrierOption>('/carriers?limit=200'),
    staleTime: 120_000,
  });

  const claims = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.total ?? 0;

  /* ── Computed metrics ── */
  const avgAge = useMemo(() => {
    if (!claims.length) return 0;
    const ages = claims
      .filter(c => c.createdAt)
      .map(c => Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86_400_000));
    return ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
  }, [claims]);

  const newThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    return claims.filter(c => c.createdAt && new Date(c.createdAt).getTime() > cutoff).length;
  }, [claims]);

  const needsAttention = useMemo(() => {
    return claims.filter(c => {
      if (!c.createdAt) return false;
      const age = (Date.now() - new Date(c.createdAt).getTime()) / 86_400_000;
      return age > 30 && (c.status === 'pending' || c.status === 'in_review');
    }).length;
  }, [claims]);

  /* ── Tab counts ── */
  const tabCount: Record<string, number | undefined> = {
    '': stats?.total,
    pending: stats?.pending,
    filed: stats?.filed,
    in_review: stats?.inReview,
    settled: stats?.settled,
    declined: stats?.declined,
    deleted: stats?.deleted,
  };

  /* ── Handlers ── */
  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(prev =>
      prev.size === claims.length ? new Set() : new Set(claims.map(c => c.id)),
    );

  const clearFilters = () => {
    setSearchInput('');
    setClaimType('');
    setCarrierId('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!(debouncedSearch || claimType || carrierId || dateFrom || dateTo);

  const queryClient = useQueryClient();
  const [bulkStatusModal, setBulkStatusModal] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState('pending');

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await Promise.all(ids.map(cid => put(`/claims/${cid}/status`, { status })));
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.ids.length} claim(s) updated to ${vars.status}`);
      setSelectedIds(new Set());
      setBulkStatusModal(false);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
    onError: () => toast.error('Failed to update some claims'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(cid => del(`/claims/${cid}`)));
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} claim(s) deleted`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
    onError: () => toast.error('Failed to delete some claims'),
  });

  function handleBulkExport() {
    const ids = Array.from(selectedIds);
    apiClient.get('/reports/export/claims', { responseType: 'blob', params: { ids: ids.join(','), format: 'csv' } })
      .then(res => {
        const url = URL.createObjectURL(res.data as Blob);
        const a = document.createElement('a'); a.href = url; a.download = `claims-export-${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Claims exported');
      })
      .catch(() => toast.error('Export failed'));
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} claim(s)? This action cannot be undone.`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  }

  /* ── Helpers ── */
  const claimAge = (c: Claim) => {
    if (!c.createdAt) return '—';
    const d = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86_400_000);
    if (d === 0) return 'Today';
    return d === 1 ? '1 day' : `${d} days`;
  };

  const lastActivity = (c: Claim) => {
    const raw = c.updatedAt || c.createdAt;
    if (!raw) return '—';
    const d = Math.floor((Date.now() - new Date(raw).getTime()) / 86_400_000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return formatDate(raw);
  };

  const showFrom = Math.min((page - 1) * limit + 1, totalItems);
  const showTo = Math.min(page * limit, totalItems);

  /* ── Sort icon ── */
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-500" />
      : <ArrowDown className="w-3 h-3 text-blue-500" />;
  };

  /* ────────────────────────────────────────────────────────────
     Render
     ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Claims
        </h1>
        <Link
          href="/claims/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Claim
        </Link>
      </div>

      {/* ═══ Status Tabs ═══ */}
      <div className="border-b border-slate-200 dark:border-slate-700/80 -mx-1">
        <nav className="flex gap-0.5 overflow-x-auto px-1 scrollbar-none" aria-label="Status">
          {STATUS_TABS.map(tab => {
            const active = activeTab === tab.key;
            const count = tabCount[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); setSelectedIds(new Set()); }}
                className={cn(
                  'relative shrink-0 px-4 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {count != null && (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold leading-none',
                        active
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </span>
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ═══ Stats Strip ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Total Claims', value: stats?.total ?? '—', Icon: BarChart3, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Avg Age',      value: claims.length ? `${avgAge}d` : '—', Icon: Clock, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'New This Week', value: claims.length ? newThisWeek : '—', Icon: TrendingUp, accent: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Needs Attention', value: claims.length ? needsAttention : '—', Icon: AlertCircle, accent: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ] as const).map(s => (
          <div
            key={s.label}
            className="flex items-center gap-3.5 p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', s.bg)}>
              <s.Icon className={cn('w-5 h-5', s.accent)} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                {s.value}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Filter Bar ═══ */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search claims…"
            className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="From date"
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
        />
        <span className="text-slate-400 text-xs select-none">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="To date"
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
        />

        {/* Carrier */}
        <select
          value={carrierId}
          onChange={e => setCarrierId(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition min-w-[140px]"
        >
          <option value="">All Carriers</option>
          {carriers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Claim type */}
        <select
          value={claimType}
          onChange={e => setClaimType(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition min-w-[130px]"
        >
          <option value="">All Types</option>
          {Object.entries(CLAIM_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {debouncedSearch && (
            <FilterBadge color="blue" onRemove={() => setSearchInput('')}>
              Search: &ldquo;{debouncedSearch}&rdquo;
            </FilterBadge>
          )}
          {claimType && (
            <FilterBadge color="purple" onRemove={() => setClaimType('')}>
              Type: {CLAIM_TYPES[claimType as keyof typeof CLAIM_TYPES] ?? claimType}
            </FilterBadge>
          )}
          {carrierId && (
            <FilterBadge color="indigo" onRemove={() => setCarrierId('')}>
              Carrier: {carriers.find(c => c.id === carrierId)?.name ?? carrierId}
            </FilterBadge>
          )}
          {dateFrom && (
            <FilterBadge color="emerald" onRemove={() => setDateFrom('')}>
              From: {dateFrom}
            </FilterBadge>
          )}
          {dateTo && (
            <FilterBadge color="emerald" onRemove={() => setDateTo('')}>
              To: {dateTo}
            </FilterBadge>
          )}
        </div>
      )}

      {/* ═══ Bulk Action Bar ═══ */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-blue-200 dark:bg-blue-800" />
          <BulkButton icon={RefreshCw} onClick={() => setBulkStatusModal(true)}>Change Status</BulkButton>
          <BulkButton icon={Download} onClick={handleBulkExport}>Export</BulkButton>
          <BulkButton icon={Trash2} danger onClick={handleBulkDelete}>Delete</BulkButton>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* ═══ Table ═══ */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
                <th className="w-11 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={claims.length > 0 && selectedIds.size === claims.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500/40 cursor-pointer"
                  />
                </th>
                <SortableHeader field="status" label="Status" sort={{ sortBy, sortOrder }} onSort={toggleSort} />
                <SortableHeader field="claimNumber" label="Claim #" sort={{ sortBy, sortOrder }} onSort={toggleSort} />
                <th className="text-left px-4 py-3 hidden lg:table-cell">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</span>
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Carrier</span>
                </th>
                <SortableHeader field="claimAmount" label="Amount" sort={{ sortBy, sortOrder }} onSort={toggleSort} />
                <SortableHeader field="createdAt" label="Age" sort={{ sortBy, sortOrder }} onSort={toggleSort} className="hidden sm:table-cell" />
                <SortableHeader field="updatedAt" label="Last Activity" sort={{ sortBy, sortOrder }} onSort={toggleSort} className="hidden xl:table-cell" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : claims.length
                  ? claims.map(claim => {
                    const selected = selectedIds.has(claim.id);
                    return (
                      <tr
                        key={claim.id}
                        onClick={() => router.push(`/claims/${claim.id}`)}
                        className={cn(
                          'cursor-pointer transition-colors group',
                          selected
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/20',
                        )}
                      >
                        <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(claim.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500/40 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold leading-5',
                            STATUS_PILL[claim.status] ?? STATUS_PILL.pending,
                          )}>
                            {STATUS_LABEL[claim.status] ?? claim.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                            {claim.claimNumber}
                          </span>
                          {claim.proNumber && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                              PRO: {claim.proNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                          {(claim as any).customerName || '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                          {(claim as any).carrierName || '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white tabular-nums">
                          {claim.claimAmount ? formatCurrency(claim.claimAmount) : '—'}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-400 tabular-nums">
                          {claimAge(claim)}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-slate-500 dark:text-slate-400">
                          {lastActivity(claim)}
                        </td>
                      </tr>
                    );
                  })
                  : (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center">
                            <Search className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-base font-medium text-slate-600 dark:text-slate-300">
                            No claims found
                          </p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                            Try adjusting your filters or create a new claim to get started.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>
                Showing{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{showFrom}–{showTo}</span>
                {' '}of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{totalItems}</span>
              </span>
              <select
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refetch indicator */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg text-sm text-slate-600 dark:text-slate-300">
          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Updating…
        </div>
      )}

      {/* Bulk Status Change Modal */}
      {bulkStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Change Status</h3>
            <p className="text-sm text-slate-500 mb-4">Update {selectedIds.size} claim(s) to:</p>
            <select
              value={bulkNewStatus}
              onChange={e => setBulkNewStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-4"
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setBulkStatusModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
              <button
                onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: bulkNewStatus })}
                disabled={bulkStatusMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {bulkStatusMutation.isPending ? 'Updating…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────── */

function SortableHeader({
  field, label, sort, onSort, className,
}: {
  field: SortField;
  label: string;
  sort: { sortBy: SortField; sortOrder: SortOrder };
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = sort.sortBy === field;
  const Icon = !active ? ArrowUpDown : sort.sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cn('text-left px-4 py-3', className)}>
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition"
      >
        {label}
        <Icon className={cn('w-3 h-3', active ? 'text-blue-500' : 'opacity-40')} />
      </button>
    </th>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-3.5"><div className="mx-auto w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="px-4 py-3.5"><div className="w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="w-28 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="px-4 py-3.5"><div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="w-14 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="px-4 py-3.5 hidden xl:table-cell"><div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
    </tr>
  );
}

const BADGE_COLORS: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  purple:  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  indigo:  'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

function FilterBadge({
  color, onRemove, children,
}: {
  color: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', BADGE_COLORS[color])}>
      {children}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition"><X className="w-3 h-3" /></button>
    </span>
  );
}

function BulkButton({
  icon: Icon, danger, children, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition',
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
          : 'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}
