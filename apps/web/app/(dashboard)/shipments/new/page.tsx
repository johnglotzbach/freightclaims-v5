'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { post } from '@/lib/api-client';
import { ArrowLeft, Package, Save } from 'lucide-react';

export default function NewShipmentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    proNumber: '',
    bolNumber: '',
    carrierName: '',
    originCity: '',
    originState: '',
    destinationCity: '',
    destinationState: '',
    shipDate: '',
    deliveryDate: '',
    weight: '',
    pieces: '',
    commodity: '',
    notes: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await post('/shipments', form);
      toast.success('Shipment created successfully');
      router.push('/shipments');
    } catch {
      toast.error('Failed to create shipment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/shipments" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add Shipment</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create a new shipment record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
          <Package className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Shipment Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PRO Number *</label>
            <input type="text" required value={form.proNumber} onChange={(e) => update('proNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" placeholder="PRO-123456" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">BOL Number</label>
            <input type="text" value={form.bolNumber} onChange={(e) => update('bolNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" placeholder="BOL-789012" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carrier Name *</label>
            <input type="text" required value={form.carrierName} onChange={(e) => update('carrierName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" placeholder="FedEx Freight" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Origin City *</label>
            <input type="text" required value={form.originCity} onChange={(e) => update('originCity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Origin State *</label>
            <input type="text" required maxLength={2} value={form.originState} onChange={(e) => update('originState', e.target.value.toUpperCase())} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" placeholder="OH" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destination City *</label>
            <input type="text" required value={form.destinationCity} onChange={(e) => update('destinationCity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destination State *</label>
            <input type="text" required maxLength={2} value={form.destinationState} onChange={(e) => update('destinationState', e.target.value.toUpperCase())} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" placeholder="CA" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ship Date *</label>
            <input type="date" required value={form.shipDate} onChange={(e) => update('shipDate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expected Delivery</label>
            <input type="date" value={form.deliveryDate} onChange={(e) => update('deliveryDate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (lbs)</label>
            <input type="number" min="0" value={form.weight} onChange={(e) => update('weight', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pieces</label>
            <input type="number" min="0" value={form.pieces} onChange={(e) => update('pieces', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Commodity</label>
          <input type="text" value={form.commodity} onChange={(e) => update('commodity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm" placeholder="Electronics, Furniture, Food Products..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm resize-none" placeholder="Special handling instructions, reference numbers..." />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Link href="/shipments" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            <Save className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Shipment'}
          </button>
        </div>
      </form>
    </div>
  );
}
