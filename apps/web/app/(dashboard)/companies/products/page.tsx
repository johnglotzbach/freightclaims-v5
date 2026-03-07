'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put, del } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Package, Search, Plus, Edit2, Trash2,
  Download, Upload, X, Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  value?: number;
  weight?: number;
  customerName?: string;
  customerId?: string;
}

interface Customer {
  id: string;
  name: string;
}

const emptyProduct = { id: '', name: '', sku: '', description: '', value: undefined, weight: undefined, customerId: '' };

export default function AllProductsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product> & { customerId?: string }>(emptyProduct);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getList<Product>('/customers/products'),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getList<Customer>('/customers', { params: { limit: 100 } }),
  });
  const customers = customersData ?? [];

  const createMutation = useMutation({
    mutationFn: (data: Omit<Product, 'id' | 'customerName'> & { customerId: string }) =>
      post('/customers/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product added');
      setShowCreate(false);
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add product'),
  });

  const updateMutation = useMutation({
    mutationFn: (p: Product) =>
      put(`/customers/products/${p.id}`, { ...p, customerId: p.customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated');
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (p: Product) =>
      del(`/customers/products/${p.id}?customerId=${encodeURIComponent(p.customerId || '')}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete product'),
  });

  const handleExport = () => {
    const headers = ['Name', 'SKU', 'Description', 'Value', 'Weight', 'Company'];
    const rows = filtered.map(p => [
      p.name,
      p.sku || '',
      p.description || '',
      p.value ?? '',
      p.weight ?? '',
      p.customerName,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV must have header and at least one row');
        return;
      }
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const nameIdx = headers.findIndex(h => /name/i.test(h));
      const skuIdx = headers.findIndex(h => /sku/i.test(h));
      const descIdx = headers.findIndex(h => /description|desc/i.test(h));
      const valueIdx = headers.findIndex(h => /value/i.test(h));
      const weightIdx = headers.findIndex(h => /weight/i.test(h));
      const customerId = customers[0]?.id;
      if (!customerId) {
        toast.error('No customer found. Add a customer first.');
        return;
      }
      let added = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const name = nameIdx >= 0 ? vals[nameIdx] : vals[0];
        if (!name) continue;
        try {
          await createMutation.mutateAsync({
            name,
            sku: skuIdx >= 0 ? vals[skuIdx] : undefined,
            description: descIdx >= 0 ? vals[descIdx] : undefined,
            value: valueIdx >= 0 ? parseFloat(vals[valueIdx]) || undefined : undefined,
            weight: weightIdx >= 0 ? parseFloat(vals[weightIdx]) || undefined : undefined,
            customerId,
          });
          added++;
        } catch {
          // skip failed rows
        }
      }
      toast.success(`Imported ${added} products`);
    } catch {
      toast.error('Failed to parse CSV');
    }
    e.target.value = '';
  };

  const filtered = products.filter(p =>
    `${p.name} ${p.sku} ${p.customerName} ${p.description}`.toLowerCase().includes(search.toLowerCase())
  );

  const formProduct = editing ?? (showCreate ? { ...emptyProduct, ...formData } : null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-primary-500" /> All Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} products across all customers</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <button onClick={handleImport} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Upload className="w-4 h-4" /> Import Catalog</button>
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => { setShowCreate(true); setEditing(null); setFormData(emptyProduct); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Product</button>
        </div>
      </div>

      {formProduct && (
        <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Edit' : 'Add'} Product</h3>
            <button onClick={() => { setShowCreate(false); setEditing(null); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" value={formProduct.name} onChange={(e) => editing ? setEditing({ ...formProduct, name: e.target.value }) : setFormData(d => ({ ...d, name: e.target.value }))} placeholder="Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={formProduct.sku || ''} onChange={(e) => editing ? setEditing({ ...formProduct, sku: e.target.value }) : setFormData(d => ({ ...d, sku: e.target.value }))} placeholder="SKU" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={formProduct.description || ''} onChange={(e) => editing ? setEditing({ ...formProduct, description: e.target.value }) : setFormData(d => ({ ...d, description: e.target.value }))} placeholder="Description" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 md:col-span-2" />
            <input type="number" value={formProduct.value ?? ''} onChange={(e) => editing ? setEditing({ ...formProduct, value: e.target.value ? parseFloat(e.target.value) : undefined }) : setFormData(d => ({ ...d, value: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="Value" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="number" value={formProduct.weight ?? ''} onChange={(e) => editing ? setEditing({ ...formProduct, weight: e.target.value ? parseFloat(e.target.value) : undefined }) : setFormData(d => ({ ...d, weight: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="Weight (lbs)" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            {!editing && (
              <select value={(formProduct as { customerId?: string }).customerId || ''} onChange={(e) => setFormData(d => ({ ...d, customerId: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 md:col-span-2">
                <option value="">Select company...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button
              onClick={() => {
                const cp = formProduct as Product & { customerId?: string };
                if (editing) {
                  updateMutation.mutate({ ...cp, customerId: cp.customerId || '' });
                } else {
                  const customerId = (formProduct as { customerId?: string }).customerId;
                  if (!customerId) { toast.error('Select a company'); return; }
                  createMutation.mutate({ name: cp.name, sku: cp.sku, description: cp.description, value: cp.value, weight: cp.weight, customerId });
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending || !formProduct.name}
              className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            ><Save className="w-4 h-4 inline mr-1" /> Save</button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, or company..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      </div>

      {products.length === 0 && !formProduct ? (
        <EmptyState icon={Package} title="No products yet" description="Add your first product to get started." />
      ) : (
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
                    <button onClick={() => { setEditing(p); setShowCreate(false); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p); }} disabled={deleteMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
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
