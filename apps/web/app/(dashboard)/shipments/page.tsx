'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, del } from '@/lib/api-client';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Truck, Plus, Search, Filter, Download, Upload,
  MapPin, Calendar, Package, ArrowRight, MoreVertical,
  Edit2, Trash2, Eye, ChevronDown,
} from 'lucide-react';

type ShipmentStatus = 'in_transit' | 'delivered' | 'pending' | 'exception';

interface Shipment {
  id: string;
  proNumber: string;
  bolNumber: string;
  carrierName: string;
  carrierScac: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  shipDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  status: ShipmentStatus;
  weight: string;
  pieces: number;
  commodity: string;
  mode: string;
  claimId?: string;
  claimNumber?: string;
}

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string }> = {
  in_transit: { label: 'In Transit', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  exception: { label: 'Exception', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
};

export default function ShipmentsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => getList<Shipment>('/shipments'),
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ShipmentStatus>('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/shipments/${id}`),
    onSuccess: () => { toast.success('Shipment deleted'); queryClient.invalidateQueries({ queryKey: ['shipments'] }); },
    onError: () => toast.error('Failed to delete shipment'),
  });

  function handleExport() {
    const csv = ['PRO Number,BOL Number,Carrier,SCAC,Origin,Destination,Ship Date,Status,Mode', ...shipments.map(s => `"${s.proNumber}","${s.bolNumber}","${s.carrierName}","${s.carrierScac}","${s.originCity} ${s.originState}","${s.destinationCity} ${s.destinationState}","${s.shipDate}","${s.status}","${s.mode}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'shipments.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('Shipments exported');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    post<any>('/shipments/mass-upload', formData)
      .then(() => { toast.success('Shipments imported'); queryClient.invalidateQueries({ queryKey: ['shipments'] }); })
      .catch(() => toast.error('Import failed'));
    e.target.value = '';
  }

  if (isLoading) return <div className="space-y-6"><StatsSkeleton /><TableSkeleton /></div>;
  if (shipments.length === 0) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Truck className="w-6 h-6 text-primary-500" /> Shipments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage all freight shipments</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Upload className="w-4 h-4" /> Import</button>
          <Link href="/shipments/new" className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> New Shipment</Link>
        </div>
      </div>
      <EmptyState icon={Truck} title="No shipments yet" description="Create your first shipment or import a CSV to start tracking freight." />
    </div>
  );

  const filtered = shipments.filter(s => {
    const matchesSearch = [s.proNumber, s.bolNumber, s.carrierName, s.originCity, s.destinationCity].some(v => (v || '').toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesMode = modeFilter === 'all' || s.mode === modeFilter;
    return matchesSearch && matchesStatus && matchesMode;
  });

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => s.status === 'in_transit').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    withClaims: shipments.filter(s => s.claimId).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Truck className="w-6 h-6 text-primary-500" /> Shipments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage all freight shipments</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Upload className="w-4 h-4" /> Import</button>
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <Link href="/shipments/new" className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> New Shipment</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p><p className="text-xs text-slate-500">Total Shipments</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-blue-600">{stats.inTransit}</p><p className="text-xs text-slate-500">In Transit</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p><p className="text-xs text-slate-500">Delivered</p></div>
        <div className="card p-4"><p className="text-2xl font-bold text-red-500">{stats.withClaims}</p><p className="text-xs text-slate-500">With Claims</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by PRO, BOL, carrier, city..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'in_transit', 'delivered', 'pending', 'exception'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border capitalize', statusFilter === s ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-500/10 dark:border-primary-500/30' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>{s === 'all' ? 'All' : STATUS_CONFIG[s].label}</button>
          ))}
        </div>
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-xs dark:bg-slate-700 dark:border-slate-600">
          <option value="all">All Modes</option>
          <option value="LTL">LTL</option>
          <option value="FTL">FTL</option>
          <option value="Parcel">Parcel</option>
        </select>
      </div>

      {/* Shipments Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">PRO #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Carrier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Route</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Ship Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Mode</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Claim</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {filtered.map(s => (
              <React.Fragment key={s.id}>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-slate-900 dark:text-white">{s.proNumber}</p>
                    <p className="text-[10px] text-slate-400">{s.bolNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{s.carrierName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{s.carrierScac}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>{s.originCity}, {s.originState}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300 mx-1" />
                      <MapPin className="w-3 h-3 text-red-400" />
                      <span>{s.destinationCity}, {s.destinationState}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{s.shipDate}</td>
                  <td className="px-4 py-3"><span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_CONFIG[s.status].color)}>{STATUS_CONFIG[s.status].label}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.mode}</td>
                  <td className="px-4 py-3">{s.claimNumber ? <Link href={`/claims/${s.claimId}`} className="text-xs text-primary-500 hover:text-primary-600 font-mono font-medium">{s.claimNumber}</Link> : <span className="text-xs text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right"><ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', expandedId === s.id && 'rotate-180')} /></td>
                </tr>
                {expandedId === s.id && (
                  <tr key={`${s.id}-detail`}>
                    <td colSpan={8} className="px-4 py-4 bg-slate-50 dark:bg-slate-800/30">
                      <div className="grid md:grid-cols-4 gap-4 text-xs">
                        <div><span className="text-slate-500">Weight:</span> <span className="font-medium ml-1">{s.weight}</span></div>
                        <div><span className="text-slate-500">Pieces:</span> <span className="font-medium ml-1">{s.pieces}</span></div>
                        <div><span className="text-slate-500">Commodity:</span> <span className="font-medium ml-1">{s.commodity}</span></div>
                        <div><span className="text-slate-500">Expected:</span> <span className="font-medium ml-1">{s.expectedDelivery}</span></div>
                        {s.actualDelivery && <div><span className="text-slate-500">Actual Delivery:</span> <span className="font-medium ml-1">{s.actualDelivery}</span></div>}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href={`/shipments/${s.id}`} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium"><Eye className="w-3 h-3" /> View Details</Link>
                        <Link href={`/shipments/${s.id}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"><Edit2 className="w-3 h-3" /> Edit</Link>
                        {!s.claimId && <Link href={`/claims/new?shipmentId=${s.id}`} className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 font-medium"><Package className="w-3 h-3" /> File Claim</Link>}
                        <button onClick={() => { if (window.confirm('Delete this shipment?')) deleteMutation.mutate(s.id); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"><Trash2 className="w-3 h-3" /> Delete</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
