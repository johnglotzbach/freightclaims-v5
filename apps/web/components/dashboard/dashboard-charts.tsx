'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

interface DashboardData {
  claimsByStatus: { name: string; count: number }[];
  claimsByType: { name: string; count: number }[];
  monthlyTrend: { month: string; filed: number; settled: number; amount: number }[];
  topCarriers: { name: string; claims: number; avgSettlement: number }[];
}

export default function DashboardCharts({ data }: { data: DashboardData }) {
  const hasTrend = data.monthlyTrend.length > 0;
  const hasStatus = data.claimsByStatus.length > 0;
  const hasType = data.claimsByType.length > 0;
  const hasCarriers = data.topCarriers.length > 0;

  if (!hasTrend && !hasStatus && !hasType && !hasCarriers) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-500">No data to display yet. Start by filing your first claim.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="card p-4 lg:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Monthly Trend</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-primary-500 rounded-full" /> Filed</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Settled</span>
            </div>
          </div>
          {hasTrend ? (
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrend}>
                  <defs>
                    <linearGradient id="filedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="settledGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="filed" stroke="#2563eb" fill="url(#filedGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="settled" stroke="#10b981" fill="url(#settledGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">Trend data builds over time</div>
          )}
        </div>

        <div className="card p-4 lg:p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">By Status</h2>
          {hasStatus ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.claimsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name" paddingAngle={2}>
                      {data.claimsByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {data.claimsByStatus.slice(0, 6).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto font-medium text-slate-700 dark:text-slate-300">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No claims yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="card p-4 lg:p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Claims by Type</h2>
          {hasType ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.claimsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={90} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">No type data yet</div>
          )}
        </div>

        <div className="card p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Top Carriers</h2>
            <Link href="/reports" className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {hasCarriers ? (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-2 font-medium">Carrier</th>
                    <th className="pb-2 font-medium text-right">Claims</th>
                    <th className="pb-2 font-medium text-right">Avg Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.topCarriers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{c.name}</td>
                      <td className="py-2.5 text-right text-slate-500">{c.claims}</td>
                      <td className="py-2.5 text-right font-medium text-slate-900 dark:text-white">${c.avgSettlement.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">No carrier data yet</div>
          )}
        </div>
      </div>
    </>
  );
}
