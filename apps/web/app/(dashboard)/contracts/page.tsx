'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { useAuth } from '@/hooks/use-auth';
import {
  FileText, Plus, Search, ChevronRight, Shield, Truck, X,
} from 'lucide-react';

interface Contract {
  id: string;
  name: string;
  contractNumber?: string;
  customerId: string;
  carrierId?: string;
  type: string;
  startDate: string;
  endDate?: string;
  maxLiability?: number;
  releaseValue?: number;
  isActive: boolean;
  createdAt: string;
}

interface InsuranceCertificate {
  id: string;
  certificateNumber: string;
  provider: string;
  policyType: string;
  coverageAmount: number;
  deductible?: number;
  effectiveDate: string;
  expirationDate: string;
  isActive: boolean;
}

type Tab = 'contracts' | 'insurance' | 'tariffs';

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('contracts');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [contractForm, setContractForm] = useState({ name: '', startDate: '', endDate: '', maxLiability: '', type: 'shipping' });
  const [certForm, setCertForm] = useState({ certificateNumber: '', provider: '', coverageAmount: '', effectiveDate: '', expirationDate: '', policyType: 'cargo' });

  const customerId = (user as any)?.corporateId || (user as any)?.customerId || '';

  const createContractMutation = useMutation({
    mutationFn: (data: typeof contractForm) => post('/contracts', { ...data, customerId, maxLiability: data.maxLiability ? Number(data.maxLiability) : undefined }),
    onSuccess: () => {
      toast.success('Contract created');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowCreate(false);
      setContractForm({ name: '', startDate: '', endDate: '', maxLiability: '', type: 'shipping' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create contract'),
  });

  const createCertMutation = useMutation({
    mutationFn: (data: typeof certForm) => post('/contracts/insurance', { ...data, customerId, coverageAmount: Number(data.coverageAmount) || 0 }),
    onSuccess: () => {
      toast.success('Certificate created');
      queryClient.invalidateQueries({ queryKey: ['insurance-certificates'] });
      setShowCreate(false);
      setCertForm({ certificateNumber: '', provider: '', coverageAmount: '', effectiveDate: '', expirationDate: '', policyType: 'cargo' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create certificate'),
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => get<{ data: Contract[]; pagination: any }>('/contracts').then((r) => r.data),
  });

  const { data: certificates = [], isLoading: certsLoading } = useQuery({
    queryKey: ['insurance-certificates'],
    queryFn: () => get<{ data: InsuranceCertificate[]; pagination: any }>('/contracts/insurance').then((r) => r.data),
  });

  const isLoading = activeTab === 'contracts' ? contractsLoading : certsLoading;

  const tabs = [
    { id: 'contracts' as Tab, label: 'Contracts', icon: FileText, count: contracts.length },
    { id: 'insurance' as Tab, label: 'Insurance Certificates', icon: Shield, count: certificates.length },
    { id: 'tariffs' as Tab, label: 'Carrier Tariffs', icon: Truck, count: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contracts & Insurance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage shipping contracts, insurance certificates, and carrier tariffs</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'contracts' ? 'Add Contract' : activeTab === 'insurance' ? 'Add Certificate' : 'Add Tariff'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeTab}...`}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        />
      </div>

      {showCreate && activeTab === 'contracts' && (
        <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">New Contract</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contract Name *</label>
              <input value={contractForm.name} onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="e.g., FedEx Ground Agreement 2025" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date *</label>
              <input type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Date</label>
              <input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Max Liability ($)</label>
              <input type="number" value={contractForm.maxLiability} onChange={(e) => setContractForm({ ...contractForm, maxLiability: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select value={contractForm.type} onChange={(e) => setContractForm({ ...contractForm, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option value="shipping">Shipping</option>
                <option value="carrier">Carrier</option>
                <option value="liability">Liability</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={() => createContractMutation.mutate(contractForm)} disabled={!contractForm.name.trim() || !contractForm.startDate || createContractMutation.isPending} className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50">
              {createContractMutation.isPending ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </div>
      )}

      {showCreate && activeTab === 'insurance' && (
        <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">New Insurance Certificate</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Certificate Number *</label>
              <input value={certForm.certificateNumber} onChange={(e) => setCertForm({ ...certForm, certificateNumber: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="CERT-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Provider *</label>
              <input value={certForm.provider} onChange={(e) => setCertForm({ ...certForm, provider: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="Insurance provider name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Policy Type</label>
              <select value={certForm.policyType} onChange={(e) => setCertForm({ ...certForm, policyType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option value="cargo">Cargo</option>
                <option value="general_liability">General Liability</option>
                <option value="auto">Auto</option>
                <option value="umbrella">Umbrella</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Coverage Amount ($) *</label>
              <input type="number" value={certForm.coverageAmount} onChange={(e) => setCertForm({ ...certForm, coverageAmount: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="100000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Effective Date *</label>
              <input type="date" value={certForm.effectiveDate} onChange={(e) => setCertForm({ ...certForm, effectiveDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expiration Date *</label>
              <input type="date" value={certForm.expirationDate} onChange={(e) => setCertForm({ ...certForm, expirationDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={() => createCertMutation.mutate(certForm)} disabled={!certForm.certificateNumber.trim() || !certForm.provider.trim() || createCertMutation.isPending} className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50">
              {createCertMutation.isPending ? 'Creating...' : 'Create Certificate'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : activeTab === 'contracts' ? (
        <ContractsList contracts={contracts} search={search} />
      ) : activeTab === 'insurance' ? (
        <InsuranceList certificates={certificates} search={search} />
      ) : (
        <EmptyState icon={Truck} title="No tariffs uploaded" description="Upload carrier tariff documents to track liability limits and filing deadlines." />
      )}
    </div>
  );
}

function ContractsList({ contracts, search }: { contracts: Contract[]; search: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = contracts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    return <EmptyState icon={FileText} title="No contracts" description="Add your first shipping contract to start tracking liability and terms." />;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contract</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Period</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Max Liability</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {filtered.map((contract) => (
            <Fragment key={contract.id}>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{contract.name}</div>
                  {contract.contractNumber && <div className="text-xs text-slate-400">#{contract.contractNumber}</div>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 capitalize">
                    {contract.type}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                  {new Date(contract.startDate).toLocaleDateString()} — {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Ongoing'}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-sm font-medium text-slate-700 dark:text-slate-300">
                  {contract.maxLiability ? `$${Number(contract.maxLiability).toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    contract.isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}>
                    {contract.isActive ? 'Active' : 'Expired'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setExpandedId((prev) => (prev === contract.id ? null : contract.id))}
                    className="text-xs font-medium text-primary-500 hover:text-primary-600 inline-flex items-center gap-1"
                  >
                    View <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expandedId === contract.id && 'rotate-90')} />
                  </button>
                </td>
              </tr>
              {expandedId === contract.id && (
                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div><span className="text-slate-500">ID:</span> {contract.id}</div>
                      <div><span className="text-slate-500">Customer ID:</span> {contract.customerId}</div>
                      {contract.carrierId && <div><span className="text-slate-500">Carrier ID:</span> {contract.carrierId}</div>}
                      {contract.releaseValue != null && <div><span className="text-slate-500">Release Value:</span> ${Number(contract.releaseValue).toLocaleString()}</div>}
                      <div><span className="text-slate-500">Created:</span> {new Date(contract.createdAt).toLocaleString()}</div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsuranceList({ certificates, search }: { certificates: InsuranceCertificate[]; search: string }) {
  const filtered = certificates.filter(
    (c) =>
      c.certificateNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.provider.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    return <EmptyState icon={Shield} title="No insurance certificates" description="Upload insurance certificates to track coverage and expiration dates." />;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Certificate</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Policy Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Coverage</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Expiration</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {filtered.map((cert) => {
            const isExpiringSoon = new Date(cert.expirationDate).getTime() - Date.now() < 30 * 86400000;
            const isExpired = new Date(cert.expirationDate) < new Date();
            return (
              <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{cert.provider}</div>
                  <div className="text-xs text-slate-400">#{cert.certificateNumber}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{cert.policyType}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-sm font-medium text-slate-700 dark:text-slate-300">
                  ${Number(cert.coverageAmount).toLocaleString()}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                  {new Date(cert.expirationDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    isExpired
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : isExpiringSoon
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  )}>
                    {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
