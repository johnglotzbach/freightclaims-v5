'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get, post, apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart3, DollarSign, FileText, ArrowUpRight, ArrowDownRight,
  Download, Percent, Target,
} from 'lucide-react';

interface MetricCard {
  label: string;
  value: string;
  change: number;
  icon: typeof DollarSign;
  color: string;
}

const METRIC_CONFIG: { label: string; key: string; icon: typeof DollarSign; color: string }[] = [
  { label: 'Total Claims Value', key: 'totalClaimsValue', icon: DollarSign, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Collection Rate', key: 'collectionRate', icon: Percent, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  { label: 'Open Claims', key: 'openClaims', icon: FileText, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  { label: 'Avg Settlement Time', key: 'avgSettlementTime', icon: Target, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
];

function formatMetricValue(val: unknown): string {
  if (val == null) return '—';
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}

function formatChange(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}

type InsightTab = 'overview' | 'customers' | 'carriers' | 'collection';

export default function ReportsPage() {
  const [tab, setTab] = useState<InsightTab>('overview');
  const [dateRange, setDateRange] = useState('6m');

  const { data: dashboard } = useQuery({
    queryKey: ['reports', 'dashboard', dateRange],
    queryFn: () => get<Record<string, unknown>>(`/reports/dashboard?dateRange=${dateRange}`),
  });

  const { data: topCustomers = [] } = useQuery({
    queryKey: ['reports', 'top-customers', dateRange],
    queryFn: () => post<Array<Record<string, unknown>>>('/reports/insights/top-customers', { dateRange }),
  });

  const { data: topCarriers = [] } = useQuery({
    queryKey: ['reports', 'top-carriers', dateRange],
    queryFn: () => post<Array<Record<string, unknown>>>('/reports/insights/top-carriers', { dateRange }),
  });

  const metricsRaw = dashboard?.metrics as Array<Record<string, unknown>> | undefined;
  const metrics: MetricCard[] = Array.isArray(metricsRaw) && metricsRaw.length > 0
    ? metricsRaw.slice(0, 4).map((m, i) => ({
        label: String(m.label ?? METRIC_CONFIG[i]?.label ?? ''),
        value: formatMetricValue(m.value ?? m.val),
        change: formatChange(m.change ?? m.delta),
        icon: METRIC_CONFIG[i]?.icon ?? DollarSign,
        color: METRIC_CONFIG[i]?.color ?? 'text-slate-500 bg-slate-50 dark:bg-slate-500/10',
      }))
    : METRIC_CONFIG.map((cfg) => {
        const raw = dashboard?.[cfg.key];
        const value = raw && typeof raw === 'object' && 'value' in raw
          ? (raw as { value?: unknown }).value
          : raw;
        const change = raw && typeof raw === 'object' && 'change' in raw
          ? formatChange((raw as { change?: unknown }).change)
          : 0;
        return {
          label: cfg.label,
          value: formatMetricValue(value),
          change,
          icon: cfg.icon,
          color: cfg.color,
        };
      });

  async function handleExport() {
    try {
      const res = await apiClient.get('/reports/export/pdf', { responseType: 'blob', params: { dateRange } });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-${dateRange}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (err) {
      toast.error('Export failed');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-500" /> Insights
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Analytics and performance metrics for your claims</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="30d">Last 30 Days</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <div key={metric.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', metric.color)}>
                <metric.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                'flex items-center gap-0.5 text-xs font-semibold',
                metric.change >= 0 ? 'text-emerald-500' : 'text-red-500'
              )}>
                {metric.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(metric.change)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
            <p className="text-xs text-slate-500 mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Insight Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'overview' as InsightTab, label: 'Overview' },
          { key: 'customers' as InsightTab, label: 'Top Customers' },
          { key: 'carriers' as InsightTab, label: 'Top Carriers' },
          { key: 'collection' as InsightTab, label: 'Collection Rate' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              tab === t.key
                ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <OverviewTab dashboard={dashboard} />}
      {tab === 'customers' && <CustomersTab data={topCustomers} />}
      {tab === 'carriers' && <CarriersTab data={topCarriers} />}
      {tab === 'collection' && <CollectionTab dashboard={dashboard} topCarriers={topCarriers} />}
    </div>
  );
}

const DEFAULT_MONTHLY = [
  { month: 'Sep', filed: 18, settled: 12, denied: 3 },
  { month: 'Oct', filed: 22, settled: 15, denied: 4 },
  { month: 'Nov', filed: 15, settled: 11, denied: 2 },
  { month: 'Dec', filed: 20, settled: 14, denied: 5 },
  { month: 'Jan', filed: 25, settled: 18, denied: 3 },
  { month: 'Feb', filed: 19, settled: 13, denied: 2 },
];

const DEFAULT_STATUS = [
  { label: 'Not Filed', count: 4, total: 23, color: 'bg-slate-400' },
  { label: 'Filed', count: 6, total: 23, color: 'bg-blue-400' },
  { label: 'In Progress', count: 5, total: 23, color: 'bg-amber-400' },
  { label: 'Settled', count: 5, total: 23, color: 'bg-emerald-400' },
  { label: 'Closed', count: 3, total: 23, color: 'bg-slate-600' },
];

const DEFAULT_TYPE = [
  { label: 'Loss', count: 8, total: 23, color: 'bg-red-400' },
  { label: 'Damage', count: 10, total: 23, color: 'bg-orange-400' },
  { label: 'Shortage', count: 3, total: 23, color: 'bg-amber-400' },
  { label: 'Concealed Damage', count: 2, total: 23, color: 'bg-violet-400' },
];

function OverviewTab({ dashboard }: { dashboard?: Record<string, unknown> }) {
  const monthlyRaw = (dashboard?.monthlyData ?? dashboard?.monthly) as Array<Record<string, unknown>> | undefined;
  const monthlyData = Array.isArray(monthlyRaw) && monthlyRaw.length > 0
    ? monthlyRaw.map(d => ({
        month: String(d.month ?? d.label ?? ''),
        filed: Number(d.filed ?? d.total ?? 0),
        settled: Number(d.settled ?? 0),
        denied: Number(d.denied ?? 0),
      }))
    : DEFAULT_MONTHLY;

  const STATUS_COLORS = ['bg-slate-400', 'bg-blue-400', 'bg-amber-400', 'bg-emerald-400', 'bg-slate-600'];
  const TYPE_COLORS = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-violet-400'];

  const statusRaw = (dashboard?.claimsByStatus ?? dashboard?.byStatus) as Array<{ label?: string; name?: string; count?: number }> | undefined;
  const statusData = Array.isArray(statusRaw) && statusRaw.length > 0
    ? statusRaw.map((s, i) => ({
        label: String(s.label ?? s.name ?? ''),
        count: Number(s.count ?? 0),
        total: statusRaw.reduce((t, x) => t + Number(x.count ?? 0), 0) || 1,
        color: STATUS_COLORS[i % STATUS_COLORS.length],
      }))
    : DEFAULT_STATUS;
  const statusTotal = statusData.reduce((t, x) => t + (x.count ?? 0), 0) || 1;

  const typeRaw = (dashboard?.claimsByType ?? dashboard?.byType) as Array<{ label?: string; name?: string; count?: number }> | undefined;
  const typeData = Array.isArray(typeRaw) && typeRaw.length > 0
    ? typeRaw.map((t, i) => ({
        label: String(t.label ?? t.name ?? ''),
        count: Number(t.count ?? 0),
        total: typeRaw.reduce((s, x) => s + Number(x.count ?? 0), 0) || 1,
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      }))
    : DEFAULT_TYPE;
  const typeTotal = typeData.reduce((t, x) => t + (x.count ?? 0), 0) || 1;

  const max = Math.max(1, ...monthlyData.map(d => d.filed));

  return (
    <div className="space-y-6">
      {/* Monthly Trend Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Claims by Month</h3>
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map(d => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-0.5" style={{ height: '160px' }}>
                <div className="flex-1 flex flex-col justify-end gap-0.5">
                  <div className="bg-red-400 rounded-t" style={{ height: `${(d.denied / max) * 100}%` }} />
                  <div className="bg-emerald-400" style={{ height: `${(d.settled / max) * 100}%` }} />
                  <div className="bg-primary-400 rounded-b" style={{ height: `${((d.filed - d.settled - d.denied) / max) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs text-slate-500">{d.month}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded bg-primary-400" /> Open</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded bg-emerald-400" /> Settled</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded bg-red-400" /> Denied</span>
        </div>
      </div>

      {/* Claims by Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Claims by Status</h3>
          <div className="space-y-3">
            {statusData.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{item.count}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', item.color)} style={{ width: `${((item.count ?? 0) / statusTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Claims by Type</h3>
          <div className="space-y-3">
            {typeData.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{item.count}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', item.color)} style={{ width: `${((item.count ?? 0) / typeTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomersTab({ data }: { data: Array<Record<string, unknown>> }) {
  const rows = data.length > 0 ? data : [
    { name: '—', claimCount: 0, totalValue: '—', avgDays: 0, collectionRate: '—' },
  ];
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Claims</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Total Value</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Avg Days</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Collection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {rows.map((c, i) => {
              const name = String(c.name ?? c.customerName ?? '—');
              const claimCount = Number(c.claimCount ?? c.claims ?? 0);
              const totalValue = c.totalValue != null ? String(c.totalValue) : (c.amount != null ? `$${Number(c.amount).toLocaleString()}` : '—');
              const avgDays = Number(c.avgDays ?? c.averageDays ?? 0);
              const cr = c.collectionRate ?? c.collection;
              const collectionRate = cr != null ? (typeof cr === 'number' ? `${cr}%` : String(cr)) : '—';
              const rateNum = parseFloat(collectionRate) || 0;
              return (
                <tr key={`${name}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{claimCount}</td>
                  <td className="px-4 py-3 hidden sm:table-cell font-medium">{totalValue}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">{avgDays} days</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-1 rounded-full',
                      rateNum >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    )}>
                      {collectionRate}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CarriersTab({ data }: { data: Array<Record<string, unknown>> }) {
  const rows = data.length > 0 ? data : [
    { name: '—', code: '—', claimCount: 0, denialRate: '—', avgSettlement: '—', avgDays: 0 },
  ];
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Carrier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">SCAC</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Claims</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Denial Rate</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Avg Settlement</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Avg Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {rows.map((c, i) => {
              const name = String(c.name ?? c.carrierName ?? '—');
              const code = String(c.code ?? c.scac ?? '—');
              const claimCount = Number(c.claimCount ?? c.claims ?? 0);
              const dr = c.denialRate ?? c.denial;
              const denialRate = dr != null ? (typeof dr === 'number' ? `${dr}%` : String(dr)) : '—';
              const avgSettlement = c.avgSettlement != null ? String(c.avgSettlement) : (c.settlementAmount != null ? `$${Number(c.settlementAmount).toLocaleString()}` : '—');
              const avgDays = Number(c.avgDays ?? c.averageDays ?? 0);
              const denialNum = parseFloat(denialRate) || 0;
              return (
                <tr key={`${name}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-slate-500">{code}</td>
                  <td className="px-4 py-3 font-medium">{claimCount}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-1 rounded-full',
                      denialNum >= 30 ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    )}>
                      {denialRate}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-medium">{avgSettlement}</td>
                  <td className="px-4 py-3 text-slate-500">{avgDays}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollectionTab({ dashboard, topCarriers }: { dashboard?: Record<string, unknown>; topCarriers: Array<Record<string, unknown>> }) {
  const coll = dashboard?.collection ?? dashboard;
  const totalCollected = coll && typeof coll === 'object' && 'totalCollected' in coll
    ? (coll as Record<string, unknown>).totalCollected
    : coll && typeof coll === 'object' && 'collected' in coll
      ? (coll as Record<string, unknown>).collected
      : '$193,900';
  const pendingCollection = coll && typeof coll === 'object' && 'pendingCollection' in coll
    ? (coll as Record<string, unknown>).pendingCollection
    : coll && typeof coll === 'object' && 'pending' in coll
      ? (coll as Record<string, unknown>).pending
      : '$68,400';
  const writtenOff = coll && typeof coll === 'object' && 'writtenOff' in coll
    ? (coll as Record<string, unknown>).writtenOff
    : coll && typeof coll === 'object' && 'writeOff' in coll
      ? (coll as Record<string, unknown>).writeOff
      : '$22,200';

  const formatAmount = (v: unknown) => {
    if (v == null) return '—';
    if (typeof v === 'number') return `$${v.toLocaleString()}`;
    return String(v);
  };

  const carriers = topCarriers.length > 0 ? topCarriers : [];
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-6 text-center">
          <p className="text-3xl font-bold text-emerald-500">{formatAmount(totalCollected)}</p>
          <p className="text-sm text-slate-500 mt-1">Total Collected</p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-3xl font-bold text-amber-500">{formatAmount(pendingCollection)}</p>
          <p className="text-sm text-slate-500 mt-1">Pending Collection</p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-3xl font-bold text-red-500">{formatAmount(writtenOff)}</p>
          <p className="text-sm text-slate-500 mt-1">Written Off</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Collection by Carrier</h3>
        <div className="space-y-4">
          {carriers.length > 0 ? carriers.map((c, i) => {
            const dr = c.denialRate ?? c.denial;
            const denialNum = typeof dr === 'number' ? dr : parseFloat(String(dr ?? 0)) || 0;
            const rate = Math.max(0, Math.min(100, 100 - denialNum));
            const name = String(c.name ?? c.carrierName ?? '—');
            const code = String(c.code ?? c.scac ?? '—');
            return (
              <div key={`${name}-${i}`}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{code}</span>
                    <span className="text-slate-700 dark:text-slate-300">{name}</span>
                  </div>
                  <span className="font-medium">{rate}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', rate >= 70 ? 'bg-emerald-400' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400')}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            );
          }) : (
            <p className="text-sm text-slate-500">No carrier data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
