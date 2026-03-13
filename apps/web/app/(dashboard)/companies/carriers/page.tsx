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
  CheckCircle, XCircle, ChevronRight,
} from 'lucide-react';

interface Carrier {
  id: string;
  name: string;
  scacCode?: string;
  dotNumber?: string;
  mcNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  isActive?: boolean;
  isInternational?: boolean;
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
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', scacCode: '', dotNumber: '', mcNumber: '', email: '', phone: '' });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => post<any>('/shipments/carriers', data),
    onSuccess: () => {
      toast.success('Carrier created');
      setShowAdd(false);
      setForm({ name: '', scacCode: '', dotNumber: '', mcNumber: '', email: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    },
    onError: () => toast.error('Failed to create carrier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/shipments/carriers/${id}`),
    onSuccess: () => {
      toast.success('Carrier deleted');
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    },
    onError: () => toast.error('Failed to delete carrier'),
  });

  function handleExport() {
    const csv = [
      'Name,SCAC,DOT,MC,Email,Phone',
      ...carriers.map(c => `"${c.name}","${c.scacCode || ''}","${c.dotNumber || ''}","${c.mcNumber || ''}","${c.email || ''}","${c.phone || ''}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carriers.csv';
    a.click();
    URL.revokeObjectURL(url);
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
        const [name, scacCode, dotNumber, mcNumber, email, phone] = line.split(',').map(s => s.replace(/"/g, '').trim());
        if (name) await post('/shipments/carriers', { name, scacCode, dotNumber, mcNumber, email, phone }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      toast.success(`Imported ${lines.length} carriers`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (isLoading) return <div className="space-y-6"><StatsSkeleton /><TableSkeleton /></div>;

  const filtered = carriers.filter(c => {
    const searchLower = search.toLowerCase();
    return [c.name, c.scacCode, c.dotNumber, c.mcNumber, c.email, c.phone].some(v => (v || '').toLowerCase().includes(searchLower));
  });

  const activeCount = carriers.filter(c => c.isActive !== false).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Truck className="w-6 h-6 text-primary-500" /> Carriers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage carrier database — SCAC codes, contacts, integrations</p>
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
            <div />
            <button onClick={() => { if (!form.name) { toast.error('Carrier name is required'); return; } createMutation.mutate(form); }} disabled={createMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Carrier'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-2xl font-bold text-slate-900 dark:text-white">{carriers.length}</p><p className="text-xs text-slate-500">Total Carriers</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-emerald-600">{activeCount}</p><p className="text-xs text-slate-500">Active</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-amber-500">{carriers.length - activeCount}</p><p className="text-xs text-slate-500">Inactive</p></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SCAC, DOT, MC, email, phone..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title="No carriers found" description={carriers.length === 0 ? 'Add your first carrier to get started.' : 'Try adjusting your search terms.'} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">SCAC Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">DOT #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">MC #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Active</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filtered.map(carrier => (
                  <tr
                    key={carrier.id}
                    onClick={() => router.push(`/companies/carriers/${carrier.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 text-primary-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{carrier.name}</p>
                          {carrier.isInternational && (
                            <span className="text-[9px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-1.5 py-0.5 rounded">INTL</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">{carrier.scacCode || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-slate-500">{carrier.dotNumber || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-slate-500">{carrier.mcNumber || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-slate-500 truncate max-w-[180px] block">{carrier.email || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-slate-500">{carrier.phone || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {carrier.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400 px-2 py-1 rounded-full">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/companies/carriers/${carrier.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 px-2 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Delete carrier ${carrier.name}?`)) deleteMutation.mutate(carrier.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete carrier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
