/**
 * Customers Page - Customer organization listing and management
 *
 * Location: apps/web/app/(dashboard)/customers/page.tsx
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { get } from '@/lib/api-client';
import type { Customer, PaginatedResponse } from 'shared';

export default function CustomersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => get<PaginatedResponse<Customer>>('/customers'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
          <p className="text-slate-500 mt-1">Manage your customer organizations</p>
        </div>
        <Link
          href="/customers/new"
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Customer
        </Link>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Email</th>
                <th>Industry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : data?.data && data.data.length > 0 ? data.data.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link href={`/customers/${customer.id}`} className="text-primary-500 hover:underline font-medium">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="font-mono text-sm">{customer.code || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.industry || '-'}</td>
                  <td>
                    <span className={customer.isActive ? 'badge badge-success' : 'badge badge-neutral'}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
