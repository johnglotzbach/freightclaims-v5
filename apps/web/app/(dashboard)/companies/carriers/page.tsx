'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put, del, apiClient } from '@/lib/api-client';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Truck, Search, Plus, Download, Upload,
  Edit2, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, Globe, Phone, Mail, MapPin,
  Shield, Database, ExternalLink, X,
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => getList<Carrier>('/shipments/carriers/all'),
  });
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', scacCode: '', dotNumber: '', mcNumber: '', email: '', phone: '', mode: 'LTL' });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => post<any>('/shipments/carriers', data),
    onSuccess: () => { toast.success('Carrier created'); setShowAdd(false); setForm({ name: '', scacCode: '', dotNumber: '', mcNumber: '', email: '', phone: '', mode: 'LTL' }); queryClient.invalidateQueries({ queryKey: ['carriers'] }); },
    onError: () => toast.error('Failed to create carrier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/shipments/carriers/${id}`),
    onSuccess: () => { toast.success('Carrier deleted'); queryClient.invalidateQueries({ queryKey: ['carriers'] }); },
    onError: () => toast.error('Failed to delete carrier'),
  });

  function handleExport() {
    const csv = ['Name,SCAC,DOT,MC,Mode,Email,Phone', ...carriers.map(c => `"${c.name}","${c.scacCode}","${c.dotNumber}","${c.mcNumber}","${c.mode}","${c.email}","${c.phone}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'carriers.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('Carriers exported');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').slice(1).filter(l => l.trim());
      for (const line of lines) {
        const [name, scacCode, dotNumber, mcNumber, mode, email, phone] = line.split(',').map(s => s.replace(/"/g, '').trim());
        if (name) await post('/shipments/carriers', { name, scacCode, dotNumber, mcNumber, mode, email, phone }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      toast.success(`Imported ${lines.length} carriers`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

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
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Upload className="w-4 h-4" /> Import</button>
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Carrier</button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Add Carrier</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input placeholder="Carrier Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="SCAC Code" value={form.scacCode} onChange={e => setForm(f => ({ ...f, scacCode: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="DOT Number" value={form.dotNumber} onChange={e => setForm(f => ({ ...f, dotNumber: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="MC Number" value={form.mcNumber} onChange={e => setForm(f => ({ ...f, mcNumber: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              <option>LTL</option><option>FTL</option><option>Parcel</option>
            </select>
            <button onClick={() => { if (!form.name) { toast.error('Carrier name is required'); return; } createMutation.mutate(form); }} disabled={createMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Carrier'}
            </button>
          </div>
        </div>
      )}

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
                  <Link href={`/companies/${carrier.id}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"><Edit2 className="w-3 h-3" /> Edit</Link>
                  <Link href={`/claims/list?carrier=${carrier.scacCode}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"><Database className="w-3 h-3" /> View Claims</Link>
                  <Link href="/settings/api-setup" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"><Shield className="w-3 h-3" /> Integration</Link>
                  <button onClick={() => { if (window.confirm(`Delete carrier ${carrier.name}?`)) deleteMutation.mutate(carrier.id); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"><Trash2 className="w-3 h-3" /> Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
