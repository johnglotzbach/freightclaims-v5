'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users,
  Truck, FileText, ArrowUpRight, ArrowDownRight, Calendar,
  Download, Filter, Percent, Target, AlertCircle,
} from 'lucide-react';

interface MetricCard {
  label: string;
  value: string;
  change: number;
  icon: typeof DollarSign;
  color: string;
}

const METRICS: MetricCard[] = [
  { label: 'Total Claims Value', value: '$284,500', change: 12.5, icon: DollarSign, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Collection Rate', value: '68.2%', change: 3.1, icon: Percent, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  { label: 'Open Claims', value: '23', change: -8.3, icon: FileText, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  { label: 'Avg Settlement Time', value: '42 days', change: -15.2, icon: Target, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
];

const TOP_CUSTOMERS = [
  { name: 'Armstrong Transport Group', claimCount: 12, totalValue: '$48,200', avgDays: 35, collectionRate: '72%' },
  { name: 'Auto Parts Unlimited', claimCount: 8, totalValue: '$31,800', avgDays: 45, collectionRate: '65%' },
  { name: 'Coffee Plus', claimCount: 5, totalValue: '$22,500', avgDays: 28, collectionRate: '80%' },
  { name: 'Appliance Direct', claimCount: 4, totalValue: '$18,900', avgDays: 52, collectionRate: '58%' },
  { name: "Tim's Tires", claimCount: 3, totalValue: '$12,400', avgDays: 38, collectionRate: '75%' },
];

const TOP_CARRIERS = [
  { name: 'Central Transport LLC', code: 'CTII', claimCount: 15, denialRate: '33%', avgSettlement: '$2,800', avgDays: 48 },
  { name: 'ESTES Express Lines', code: 'EXLA', claimCount: 11, denialRate: '18%', avgSettlement: '$3,200', avgDays: 35 },
  { name: 'Accurate Cargo Delivery', code: 'ACCD', claimCount: 9, denialRate: '22%', avgSettlement: '$2,100', avgDays: 42 },
  { name: 'BEK Logistics LLC', code: 'BEKL', claimCount: 7, denialRate: '43%', avgSettlement: '$1,900', avgDays: 55 },
  { name: 'AAA Cooper Transport', code: 'AACT', claimCount: 6, denialRate: '17%', avgSettlement: '$4,100', avgDays: 30 },
];

const MONTHLY_DATA = [
  { month: 'Sep', filed: 18, settled: 12, denied: 3, value: 42000 },
  { month: 'Oct', filed: 22, settled: 15, denied: 4, value: 51000 },
  { month: 'Nov', filed: 15, settled: 11, denied: 2, value: 38000 },
  { month: 'Dec', filed: 20, settled: 14, denied: 5, value: 47000 },
  { month: 'Jan', filed: 25, settled: 18, denied: 3, value: 58000 },
  { month: 'Feb', filed: 19, settled: 13, denied: 2, value: 44000 },
];

type InsightTab = 'overview' | 'customers' | 'carriers' | 'collection';

export default function ReportsPage() {
  const [tab, setTab] = useState<InsightTab>('overview');
  const [dateRange, setDateRange] = useState('6m');

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
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map(metric => (
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
      {tab === 'overview' && <OverviewTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'carriers' && <CarriersTab />}
      {tab === 'collection' && <CollectionTab />}
    </div>
  );
}

function OverviewTab() {
  const max = Math.max(...MONTHLY_DATA.map(d => d.filed));

  return (
    <div className="space-y-6">
      {/* Monthly Trend Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Claims by Month</h3>
        <div className="flex items-end gap-3 h-48">
          {MONTHLY_DATA.map(d => (
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
            {[
              { label: 'Not Filed', count: 4, total: 23, color: 'bg-slate-400' },
              { label: 'Filed', count: 6, total: 23, color: 'bg-blue-400' },
              { label: 'In Progress', count: 5, total: 23, color: 'bg-amber-400' },
              { label: 'Settled', count: 5, total: 23, color: 'bg-emerald-400' },
              { label: 'Closed', count: 3, total: 23, color: 'bg-slate-600' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{item.count}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', item.color)} style={{ width: `${(item.count / item.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Claims by Type</h3>
          <div className="space-y-3">
            {[
              { label: 'Loss', count: 8, total: 23, color: 'bg-red-400' },
              { label: 'Damage', count: 10, total: 23, color: 'bg-orange-400' },
              { label: 'Shortage', count: 3, total: 23, color: 'bg-amber-400' },
              { label: 'Concealed Damage', count: 2, total: 23, color: 'bg-violet-400' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{item.count}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', item.color)} style={{ width: `${(item.count / 23) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomersTab() {
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
            {TOP_CUSTOMERS.map((c, i) => (
              <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{c.claimCount}</td>
                <td className="px-4 py-3 hidden sm:table-cell font-medium">{c.totalValue}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{c.avgDays} days</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'text-xs font-semibold px-2 py-1 rounded-full',
                    parseInt(c.collectionRate) >= 70
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  )}>
                    {c.collectionRate}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CarriersTab() {
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
            {TOP_CARRIERS.map((c, i) => (
              <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-slate-500">{c.code}</td>
                <td className="px-4 py-3 font-medium">{c.claimCount}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={cn(
                    'text-xs font-semibold px-2 py-1 rounded-full',
                    parseInt(c.denialRate) >= 30
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  )}>
                    {c.denialRate}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell font-medium">{c.avgSettlement}</td>
                <td className="px-4 py-3 text-slate-500">{c.avgDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollectionTab() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-6 text-center">
          <p className="text-3xl font-bold text-emerald-500">$193,900</p>
          <p className="text-sm text-slate-500 mt-1">Total Collected</p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-3xl font-bold text-amber-500">$68,400</p>
          <p className="text-sm text-slate-500 mt-1">Pending Collection</p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-3xl font-bold text-red-500">$22,200</p>
          <p className="text-sm text-slate-500 mt-1">Written Off</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Collection by Carrier</h3>
        <div className="space-y-4">
          {TOP_CARRIERS.map(c => {
            const rate = 100 - parseInt(c.denialRate);
            return (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{c.code}</span>
                    <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
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
          })}
        </div>
      </div>
    </div>
  );
}
