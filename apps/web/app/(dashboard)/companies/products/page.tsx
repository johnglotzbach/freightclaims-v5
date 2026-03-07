'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Package, Search, Plus, Edit2, Trash2,
  Building2, Download, Upload, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  value?: number;
  weight?: number;
  customerName: string;
}

export default function AllProductsPage() {
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => get<Product[]>('/customers/products'),
  });

  const filtered = products.filter(p =>
    `${p.name} ${p.sku} ${p.customerName} ${p.description}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-primary-500" /> All Products</h1>
            <p className="text-sm text-slate-500 mt-0.5">Loading products...</p>
          </div>
        </div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-primary-500" /> All Products</h1>
            <p className="text-sm text-slate-500 mt-0.5">0 products across all customers</p>
          </div>
          <button className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Product</button>
        </div>
        <EmptyState icon={Package} title="No products yet" description="Add your first product to get started." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-primary-500" /> All Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} products across all customers</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Upload className="w-4 h-4" /> Import Catalog</button>
          <button className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <button className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Product</button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, or company..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Product</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">SKU</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Company</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Value</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden xl:table-cell">Weight</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div><span className="font-medium text-slate-900 dark:text-white">{p.name}</span></div>
                  {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{p.customerName}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs">{p.value ? `$${p.value.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-500">{p.weight ? `${p.weight} lbs` : '—'}</td>
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
