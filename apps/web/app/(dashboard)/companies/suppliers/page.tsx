'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put, del } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Package, Plus, Edit2, Trash2, Search,
  MapPin, Phone, Mail, CheckCircle, XCircle, X, Save,
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive: boolean;
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data: Supplier) => {
      if (data.id) {
        return put(`/shipments/suppliers/${data.id}`, data);
      }
      return post('/shipments/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(creating ? 'Supplier added' : 'Supplier updated');
      setEditing(null);
      setCreating(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save supplier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/shipments/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete supplier'),
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getList<Supplier>('/shipments/suppliers/all'),
  });

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-primary-500" /> Suppliers</h1>
            <p className="text-sm text-slate-500 mt-0.5">Loading suppliers...</p>
          </div>
        </div>
        <TableSkeleton rows={4} cols={6} />
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-primary-500" /> Suppliers</h1>
          </div>
          <button onClick={() => { setEditing({ id: '', name: '', isActive: true }); setCreating(true); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
        <EmptyState icon={Package} title="No suppliers yet" description="Add your first supplier to track shipment sources." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-primary-500" /> Suppliers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{suppliers.length} suppliers &middot; {suppliers.filter(s => s.isActive).length} active</p>
        </div>
        <button onClick={() => { setEditing({ id: '', name: '', isActive: true }); setCreating(true); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      </div>

      {editing && (
        <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">{creating ? 'Add' : 'Edit'} Supplier</h3>
            <button onClick={() => { setEditing(null); setCreating(false); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Supplier Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="Code" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="Email" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <input type="text" value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} placeholder="City" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={editing.state || ''} onChange={(e) => setEditing({ ...editing, state: e.target.value })} placeholder="State" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={editing.zipCode || ''} onChange={(e) => setEditing({ ...editing, zipCode: e.target.value })} placeholder="Zip" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="tel" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(null); setCreating(false); }} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button onClick={() => editing && saveMutation.mutate(editing)} disabled={saveMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Save className="w-4 h-4 inline mr-1" /> Save</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Supplier</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Code</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Contact</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-slate-500">{s.code || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{s.email || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{s.city && s.state ? `${s.city}, ${s.state}` : '—'}</td>
                <td className="px-4 py-3">
                  {s.isActive ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Active</span> : <span className="flex items-center gap-1 text-xs text-slate-400"><XCircle className="w-3.5 h-3.5" /> Inactive</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(s); setCreating(false); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (confirm('Delete this supplier?')) deleteMutation.mutate(s.id); }} disabled={deleteMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
