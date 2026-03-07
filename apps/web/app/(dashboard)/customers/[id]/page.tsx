'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { get } from '@/lib/api-client';
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin, FileText, Package } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => get<{ data: Record<string, unknown> }>(`/customers/${id}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Not Found</h2>
        <p className="text-slate-500 mt-2">This customer may have been removed or you don&apos;t have access.</p>
        <Link href="/customers" className="text-primary-500 hover:underline mt-4 inline-block">Back to Customers</Link>
      </div>
    );
  }

  const c = customer as Record<string, string | number | boolean | null>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{String(c.name || 'Customer')}</h1>
          {c.code && <p className="text-slate-500 text-sm font-mono">{String(c.code)}</p>}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {c.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Company Info</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {c.industry && (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Industry</p>
                  <p className="text-slate-900 dark:text-white font-medium">{String(c.industry)}</p>
                </div>
              )}
              {c.email && (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Email</p>
                  <a href={`mailto:${c.email}`} className="text-primary-500 hover:underline flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {String(c.email)}
                  </a>
                </div>
              )}
              {c.phone && (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Phone</p>
                  <a href={`tel:${c.phone}`} className="text-primary-500 hover:underline flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {String(c.phone)}
                  </a>
                </div>
              )}
              {c.website && (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Website</p>
                  <a href={String(c.website)} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> {String(c.website)}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Addresses</h2>
            </div>
            <p className="text-sm text-slate-500">Customer addresses will be displayed here once loaded from the API.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href={`/claims/new?customerId=${id}`} className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 py-1.5">
                <FileText className="w-4 h-4" /> File New Claim
              </Link>
              <Link href={`/shipments/new?customerId=${id}`} className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 py-1.5">
                <Package className="w-4 h-4" /> Add Shipment
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Statistics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Claims</span>
                <span className="font-semibold text-slate-900 dark:text-white">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Open Claims</span>
                <span className="font-semibold text-slate-900 dark:text-white">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Shipments</span>
                <span className="font-semibold text-slate-900 dark:text-white">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
