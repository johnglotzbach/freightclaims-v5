'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getList } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Building2, Truck, Shield, Search, Plus, Filter,
  ChevronRight, MoreHorizontal, CheckCircle, XCircle,
  TrendingUp, DollarSign, AlertCircle, Clock,
} from 'lucide-react';

type CompanyType = 'all' | 'customer' | 'carrier' | 'insurance';

interface ClaimStats {
  totalClaims: number;
  totalAmount: number;
  openClaims: number;
  avgResolutionDays: number | null;
}

interface Company {
  id: string;
  name: string;
  type?: string;
  code?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  claimCount?: number;
  isCorporate?: boolean;
  industry?: string;
  claimStats?: ClaimStats;
}

const typeConfig: Record<string, { icon: typeof Building2; color: string; label: string }> = {
  customer: { icon: Building2, color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', label: 'Customer' },
  carrier: { icon: Truck, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', label: 'Carrier' },
  insurance: { icon: Shield, color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400', label: 'Insurance' },
};

export default function CompaniesPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<CompanyType>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'claims'>('name');

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getList<Company>('/customers?includeStats=true'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton count={4} />
        <TableSkeleton />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary-500" /> Companies
            </h1>
          </div>
          <button
            onClick={() => router.push('/customers/new')}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Company
          </button>
        </div>
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Add your first company to get started tracking claims."
        />
      </div>
    );
  }

  const filtered = companies
    .filter(c => {
      if (typeFilter !== 'all' && getType(c) !== typeFilter) return false;
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.code?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'claims') return (b.claimCount || 0) - (a.claimCount || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

  const getType = (c: Company): string => c.type || (c.isCorporate ? 'customer' : 'customer');

  const counts = {
    all: companies.length,
    customer: companies.filter(c => getType(c) === 'customer').length,
    carrier: companies.filter(c => getType(c) === 'carrier').length,
    insurance: companies.filter(c => getType(c) === 'insurance').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-500" /> Companies
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {counts.customer} customers, {counts.carrier} carriers, {counts.insurance} insurance
          </p>
        </div>
        <button
          onClick={() => router.push('/customers/new')}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all' as CompanyType, label: 'All Companies', count: counts.all },
          { key: 'customer' as CompanyType, label: 'Customers', count: counts.customer },
          { key: 'carrier' as CompanyType, label: 'Carriers', count: counts.carrier },
          { key: 'insurance' as CompanyType, label: 'Insurance', count: counts.insurance },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
              typeFilter === tab.key
                ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            {tab.label}
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name or code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'claims')}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        >
          <option value="name">Sort by Name</option>
          <option value="claims">Sort by Claims</option>
        </select>
      </div>

      {/* Company List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">KPI</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtered.map((company) => {
                const config = typeConfig[getType(company)] || typeConfig.customer;
                const TypeIcon = config.icon;
                return (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/customers/${company.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.color)}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{company.name}</div>
                          {company.email && <div className="text-xs text-slate-400">{company.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-lg', config.color)}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{company.code || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                      {company.city && company.state ? `${company.city}, ${company.state}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {company.claimStats ? (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" title="Total Claims">
                            <TrendingUp className="w-3 h-3" />{company.claimStats.totalClaims}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" title="Total Amount">
                            <DollarSign className="w-3 h-3" />{company.claimStats.totalAmount >= 1000 ? `${(company.claimStats.totalAmount / 1000).toFixed(1)}k` : company.claimStats.totalAmount.toFixed(0)}
                          </span>
                          {company.claimStats.openClaims > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" title="Open Claims">
                              <AlertCircle className="w-3 h-3" />{company.claimStats.openClaims}
                            </span>
                          )}
                          {company.claimStats.avgResolutionDays != null && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400" title="Avg Resolution Days">
                              <Clock className="w-3 h-3" />{company.claimStats.avgResolutionDays}d
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{company.claimCount || 0}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {company.isActive !== false ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-400"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
