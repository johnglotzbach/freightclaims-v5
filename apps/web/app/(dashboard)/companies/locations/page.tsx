'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getList } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import {
  MapPin, Search, Plus, Edit2, Trash2,
  Building2, CheckCircle, Globe, Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
  customerName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export default function AllLocationsPage() {
  const [search, setSearch] = useState('');

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getList<Location>('/customers/locations'),
  });

  const filtered = locations.filter(l => `${l.name} ${l.customerName} ${l.city} ${l.state}`.toLowerCase().includes(search.toLowerCase()));

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

  if (locations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-primary-500" /> All Locations</h1>
          </div>
          <button className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Location</button>
        </div>
        <EmptyState icon={MapPin} title="No locations yet" description="Add your first location to start tracking shipping addresses." />
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
          <button className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <button className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Location</button>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, company, city..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      </div>
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
                  <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
