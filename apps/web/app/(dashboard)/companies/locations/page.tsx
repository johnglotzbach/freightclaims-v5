'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put, del } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import {
  MapPin, Search, Plus, Edit2, Trash2,
  Download, X, Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
  customerName?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
  customerId?: string;
}

interface Customer {
  id: string;
  name: string;
}

const emptyLocation = { id: '', name: '', address1: '', address2: '', city: '', state: '', zipCode: '', country: 'US', customerId: '' };

export default function AllLocationsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [formData, setFormData] = useState<Partial<Location> & { customerId?: string }>(emptyLocation);
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getList<Location>('/customers/locations'),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getList<Customer>('/customers', { params: { limit: 100 } }),
  });
  const customers = customersData ?? [];

  const createMutation = useMutation({
    mutationFn: (data: { customerId: string; name: string; address1: string; address2?: string; city: string; state: string; zipCode: string; country?: string }) =>
      post(`/customers/${data.customerId}/addresses`, {
        type: data.name || 'shipping',
        street1: data.address1,
        street2: data.address2,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country || 'US',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location added');
      setShowCreate(false);
      setFormData(emptyLocation);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add location'),
  });

  const updateMutation = useMutation({
    mutationFn: (loc: Location) =>
      put(`/customers/${loc.customerId}/addresses/${loc.id}`, {
        type: loc.name || 'shipping',
        street1: loc.address1,
        street2: loc.address2,
        city: loc.city,
        state: loc.state,
        zipCode: loc.zipCode,
        country: loc.country || 'US',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location updated');
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update location'),
  });

  const deleteMutation = useMutation({
    mutationFn: (loc: Location) =>
      del(`/customers/${loc.customerId}/addresses/${loc.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete location'),
  });

  const handleExport = () => {
    const headers = ['Name', 'Address', 'City', 'State', 'Zip', 'Company'];
    const rows = filtered.map(l => [l.name, l.address1, l.city, l.state, l.zipCode, l.customerName]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const filtered = locations.filter(l => `${l.name} ${l.customerName} ${l.city} ${l.state}`.toLowerCase().includes(search.toLowerCase()));

  const formLocation = editing ?? (showCreate ? { ...emptyLocation, ...formData } : null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-primary-500" /> All Locations</h1>
            <p className="text-sm text-slate-500 mt-0.5">Loading locations...</p>
          </div>
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-primary-500" /> All Locations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{locations.length} locations across all companies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => { setShowCreate(true); setEditing(null); setFormData(emptyLocation); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Location</button>
        </div>
      </div>

      {formLocation && (
        <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Edit' : 'Add'} Location</h3>
            <button onClick={() => { setShowCreate(false); setEditing(null); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" value={formLocation.name} onChange={(e) => editing ? setEditing({ ...formLocation, name: e.target.value }) : setFormData(d => ({ ...d, name: e.target.value }))} placeholder="Name (e.g. Shipping, Billing)" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={formLocation.address1} onChange={(e) => editing ? setEditing({ ...formLocation, address1: e.target.value }) : setFormData(d => ({ ...d, address1: e.target.value }))} placeholder="Address" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 md:col-span-2" />
            <input type="text" value={formLocation.address2 || ''} onChange={(e) => editing ? setEditing({ ...formLocation, address2: e.target.value }) : setFormData(d => ({ ...d, address2: e.target.value }))} placeholder="Address 2 (optional)" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 md:col-span-2" />
            <input type="text" value={formLocation.city} onChange={(e) => editing ? setEditing({ ...formLocation, city: e.target.value }) : setFormData(d => ({ ...d, city: e.target.value }))} placeholder="City" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={formLocation.state} onChange={(e) => editing ? setEditing({ ...formLocation, state: e.target.value }) : setFormData(d => ({ ...d, state: e.target.value }))} placeholder="State" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={formLocation.zipCode} onChange={(e) => editing ? setEditing({ ...formLocation, zipCode: e.target.value }) : setFormData(d => ({ ...d, zipCode: e.target.value }))} placeholder="Zip Code" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            {!editing && (
              <select value={(formLocation as { customerId?: string }).customerId || ''} onChange={(e) => setFormData(d => ({ ...d, customerId: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">Select company...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button
              onClick={() => {
                if (editing) {
                  updateMutation.mutate({ ...formLocation, customerId: formLocation.customerId || '' } as Location);
                } else {
                  const customerId = (formLocation as { customerId?: string }).customerId;
                  if (!customerId) { toast.error('Select a company'); return; }
                  createMutation.mutate({
                    customerId,
                    name: formLocation.name || 'shipping',
                    address1: formLocation.address1,
                    address2: formLocation.address2,
                    city: formLocation.city,
                    state: formLocation.state,
                    zipCode: formLocation.zipCode,
                    country: formLocation.country || 'US',
                  });
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending || !formLocation.address1 || !formLocation.city || !formLocation.state || !formLocation.zipCode}
              className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            ><Save className="w-4 h-4 inline mr-1" /> Save</button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, company, city..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      </div>

      {locations.length === 0 && !formLocation ? (
        <EmptyState icon={MapPin} title="No locations yet" description="Add your first location to start tracking shipping addresses." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Location</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Company</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Address</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">City/State</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtered.map(loc => (
                <tr key={loc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{loc.name}</span>
                      {loc.isDefault && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-semibold">Default</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">{loc.customerName}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{loc.address1}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{loc.city}, {loc.state} {loc.zipCode}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditing({ ...loc, customerId: loc.customerId }); setShowCreate(false); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm('Delete this location?')) deleteMutation.mutate({ ...loc, customerId: loc.customerId } as Location); }} disabled={deleteMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
