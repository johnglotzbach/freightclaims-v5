'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Truck, Search, Plus, Download, Upload,
  Edit2, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, Globe, Phone, Mail, MapPin,
  Shield, Database, ExternalLink,
} from 'lucide-react';

interface Carrier {
  id: string;
  name: string;
  scacCode: string;
  dotNumber: string;
  mcNumber: string;
  authority: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  mode: string;
  claimCount: number;
  avgSettlement: number;
  totalFiled: number;
  totalPaid: number;
  isActive: boolean;
  hasIntegration: boolean;
}

export default function CarriersPage() {
  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => get<Carrier[]>('/shipments/carriers'),
  });
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) return <div className="space-y-6"><StatsSkeleton /><TableSkeleton /></div>;
  if (carriers.length === 0) return <EmptyState icon={Truck} title="No carriers yet" description="Add your first carrier to start managing your carrier database." />;

  const filtered = carriers.filter(c => {
    const matchesSearch = [c.name, c.scacCode, c.dotNumber, c.mcNumber, c.city].some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchesMode = modeFilter === 'all' || c.mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Truck className="w-6 h-6 text-primary-500" /> Carriers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage carrier database — SCAC codes, contacts, integrations, claim history</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Upload className="w-4 h-4" /> Import</button>
          <button className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Carrier</button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-2xl font-bold text-slate-900 dark:text-white">{carriers.length}</p><p className="text-xs text-slate-500">Total Carriers</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-emerald-600">{carriers.filter(c => c.hasIntegration).length}</p><p className="text-xs text-slate-500">API Integrated</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-primary-600">{carriers.reduce((s, c) => s + c.claimCount, 0)}</p><p className="text-xs text-slate-500">Total Claims Filed</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-amber-500">${(carriers.reduce((s, c) => s + c.totalPaid, 0) / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Total Paid</p></div>
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SCAC, DOT, MC..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        </div>
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
          <option value="all">All Modes</option>
          <option value="LTL">LTL</option>
          <option value="FTL">FTL</option>
          <option value="Parcel">Parcel</option>
        </select>
      </div>

      {/* Carrier cards */}
      <div className="space-y-3">
        {filtered.map(carrier => (
          <div key={carrier.id} className="card overflow-hidden">
            <div className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => setExpandedId(expandedId === carrier.id ? null : carrier.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{carrier.name}</p>
                      {carrier.hasIntegration && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded">API</span>}
                      {!carrier.isActive && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">INACTIVE</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">{carrier.scacCode}</span>
                      <span>DOT: {carrier.dotNumber}</span>
                      <span>MC: {carrier.mcNumber}</span>
                      <span><MapPin className="w-3 h-3 inline" /> {carrier.city}, {carrier.state}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div><p className="text-sm font-bold text-slate-900 dark:text-white">{carrier.claimCount}</p><p className="text-[10px] text-slate-400">Claims</p></div>
                  <div><p className="text-sm font-bold text-emerald-600">${carrier.avgSettlement.toLocaleString()}</p><p className="text-[10px] text-slate-400">Avg Settlement</p></div>
                  <div><p className="text-sm font-bold text-primary-600">{Math.round((carrier.totalPaid / carrier.totalFiled) * 100)}%</p><p className="text-[10px] text-slate-400">Collection</p></div>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', expandedId === carrier.id && 'rotate-180')} />
                </div>
              </div>
            </div>

            {expandedId === carrier.id && (
              <div className="border-t border-slate-100 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/30">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase">Contact</h4>
                    <div className="text-sm space-y-1">
                      <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> <a href={`mailto:${carrier.email}`} className="text-primary-500 hover:underline">{carrier.email}</a></p>
                      <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {carrier.phone}</p>
                      <p className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-slate-400" /> <a href={`https://${carrier.website}`} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">{carrier.website}</a></p>
                      <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {carrier.address}, {carrier.city}, {carrier.state}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase">Authority</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Mode:</span><span className="font-medium">{carrier.mode}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Authority:</span><span className="font-medium">{carrier.authority}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">SCAC:</span><span className="font-mono font-semibold">{carrier.scacCode}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">DOT #:</span><span className="font-mono">{carrier.dotNumber}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">MC #:</span><span className="font-mono">{carrier.mcNumber}</span></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase">Financials</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Total Filed:</span><span className="font-bold">${carrier.totalFiled.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Total Paid:</span><span className="font-bold text-emerald-600">${carrier.totalPaid.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Collection %:</span><span className="font-bold text-primary-600">{Math.round((carrier.totalPaid / carrier.totalFiled) * 100)}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Avg Settlement:</span><span>${carrier.avgSettlement.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <Link href={`/companies/${carrier.id}`} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium"><ExternalLink className="w-3 h-3" /> Full Profile</Link>
                  <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"><Edit2 className="w-3 h-3" /> Edit</button>
                  <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"><Database className="w-3 h-3" /> View Claims</button>
                  <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"><Shield className="w-3 h-3" /> Integration</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
