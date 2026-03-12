'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, del } from '@/lib/api-client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft, Truck, MapPin, Calendar, Package, Edit2,
  Trash2, Save, X, Hash, Weight, Layers,
} from 'lucide-react';

interface Shipment {
  id: string;
  proNumber: string;
  bolNumber: string;
  carrierName: string;
  carrierScac: string;
  originCity: string;
  originState: string;
  originAddress?: string;
  originZip?: string;
  destinationCity: string;
  destinationState: string;
  destinationAddress?: string;
  destinationZip?: string;
  shipDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  status: string;
  weight: string;
  pieces: number;
  commodity?: string;
  specialInstructions?: string;
  contacts?: Array<{ id: string; name: string; email?: string; phone?: string; role?: string }>;
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Shipment>>({});

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => get<Shipment>(`/shipments/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Shipment>) => put(`/shipments/${id}`, data),
    onSuccess: () => {
      toast.success('Shipment updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
    },
    onError: () => toast.error('Failed to update shipment'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => del(`/shipments/${id}`),
    onSuccess: () => {
      toast.success('Shipment deleted');
      router.push('/shipments');
    },
    onError: () => toast.error('Failed to delete shipment'),
  });

  function startEdit() {
    if (!shipment) return;
    setForm({ ...shipment });
    setEditing(true);
  }

  function handleSave() {
    updateMutation.mutate(form);
  }

  function handleDelete() {
    if (!confirm('Delete this shipment? This cannot be undone.')) return;
    deleteMutation.mutate();
  }

  const STATUS_COLORS: Record<string, string> = {
    in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    exception: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="space-y-6">
        <Link href="/shipments" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" /> Back to Shipments
        </Link>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Shipment not found</p>
          <p className="text-sm text-slate-400 mt-1">This shipment may have been deleted.</p>
        </div>
      </div>
    );
  }

  const s = editing ? { ...shipment, ...form } : shipment;

  const Field = ({ label, value, field }: { label: string; value: string | number | undefined; field?: keyof Shipment }) => (
    <div>
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</dt>
      <dd>
        {editing && field ? (
          <input
            type="text"
            value={String(form[field] ?? value ?? '')}
            onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        ) : (
          <span className="text-sm font-medium text-slate-900 dark:text-white">{value || '—'}</span>
        )}
      </dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/shipments" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary-500" />
              {s.proNumber || s.bolNumber || 'Shipment'}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}>
              {s.status?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={updateMutation.isPending} className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition flex items-center gap-1.5 disabled:opacity-50">
                <Save className="w-4 h-4" /> {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-500/30 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition flex items-center gap-1.5 disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary-500" /> Identifiers
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="PRO Number" value={s.proNumber} field="proNumber" />
            <Field label="BOL Number" value={s.bolNumber} field="bolNumber" />
            <Field label="Carrier" value={s.carrierName} field="carrierName" />
            <Field label="SCAC" value={s.carrierScac} field="carrierScac" />
          </dl>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" /> Dates
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Ship Date" value={s.shipDate?.split('T')[0]} field="shipDate" />
            <Field label="Expected Delivery" value={s.expectedDelivery?.split('T')[0]} field="expectedDelivery" />
            <Field label="Actual Delivery" value={s.actualDelivery?.split('T')[0]} field="actualDelivery" />
            <Field label="Status" value={s.status} field="status" />
          </dl>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-500" /> Origin
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="City" value={s.originCity} field="originCity" />
            <Field label="State" value={s.originState} field="originState" />
          </dl>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" /> Destination
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="City" value={s.destinationCity} field="destinationCity" />
            <Field label="State" value={s.destinationState} field="destinationState" />
          </dl>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-500" /> Cargo Details
          </h2>
          <dl className="grid sm:grid-cols-3 gap-4">
            <Field label="Weight" value={s.weight} field="weight" />
            <Field label="Pieces" value={s.pieces} field="pieces" />
            <Field label="Commodity" value={s.commodity} field="commodity" />
          </dl>
          {s.specialInstructions && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Special Instructions</p>
              <p className="text-sm text-amber-800 dark:text-amber-200">{s.specialInstructions}</p>
            </div>
          )}
        </div>
      </div>

      {shipment.contacts && shipment.contacts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Contacts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {shipment.contacts.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{c.role || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{c.phone || '—'}</td>
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
