'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { useAuth } from '@/hooks/use-auth';
import {
  FileText, Plus, Search, ChevronRight, Shield, Truck, X,
  Edit2, Trash2, AlertTriangle, Clock,
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
  terms?: string;
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

const DEFAULT_CONTRACT_FORM = { name: '', carrierName: '', startDate: '', endDate: '', maxLiability: '', type: 'shipping', terms: '', contractNumber: '' };
const DEFAULT_CERT_FORM = { certificateNumber: '', provider: '', coverageAmount: '', effectiveDate: '', expirationDate: '', policyType: 'cargo', deductible: '' };

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('contracts');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);

  const [contractForm, setContractForm] = useState(DEFAULT_CONTRACT_FORM);
  const [certForm, setCertForm] = useState(DEFAULT_CERT_FORM);

  const customerId = (user as any)?.corporateId || (user as any)?.customerId || '';

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => get<{ data: Contract[]; pagination: any }>('/contracts').then((r) => r.data),
  });

  const { data: certificates = [], isLoading: certsLoading } = useQuery({
    queryKey: ['insurance-certificates'],
    queryFn: () => get<{ data: InsuranceCertificate[]; pagination: any }>('/contracts/insurance').then((r) => r.data),
  });

  const createContractMutation = useMutation({
    mutationFn: (data: typeof contractForm) => post('/contracts', {
      ...data, customerId,
      maxLiability: data.maxLiability ? Number(data.maxLiability) : undefined,
    }),
    onSuccess: () => {
      toast.success('Contract created');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      closeForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create contract'),
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof contractForm }) => put(`/contracts/${id}`, {
      ...data,
      maxLiability: data.maxLiability ? Number(data.maxLiability) : undefined,
    }),
    onSuccess: () => {
      toast.success('Contract updated');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      closeForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update contract'),
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => del(`/contracts/${id}`),
    onSuccess: () => {
      toast.success('Contract deleted');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: () => toast.error('Failed to delete contract'),
  });

  const createCertMutation = useMutation({
    mutationFn: (data: typeof certForm) => post('/contracts/insurance', {
      ...data, customerId,
      coverageAmount: Number(data.coverageAmount) || 0,
      deductible: data.deductible ? Number(data.deductible) : undefined,
    }),
    onSuccess: () => {
      toast.success('Certificate created');
      queryClient.invalidateQueries({ queryKey: ['insurance-certificates'] });
      closeForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create certificate'),
  });

  const updateCertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof certForm }) => put(`/contracts/insurance/${id}`, {
      ...data,
      coverageAmount: Number(data.coverageAmount) || 0,
      deductible: data.deductible ? Number(data.deductible) : undefined,
    }),
    onSuccess: () => {
      toast.success('Certificate updated');
      queryClient.invalidateQueries({ queryKey: ['insurance-certificates'] });
      closeForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update certificate'),
  });

  const deleteCertMutation = useMutation({
    mutationFn: (id: string) => del(`/contracts/insurance/${id}`),
    onSuccess: () => {
      toast.success('Certificate deleted');
      queryClient.invalidateQueries({ queryKey: ['insurance-certificates'] });
    },
    onError: () => toast.error('Failed to delete certificate'),
  });

  function closeForm() {
    setShowCreate(false);
    setEditingContractId(null);
    setEditingCertId(null);
    setContractForm(DEFAULT_CONTRACT_FORM);
    setCertForm(DEFAULT_CERT_FORM);
  }

  function startEditContract(c: Contract) {
    setEditingContractId(c.id);
    setEditingCertId(null);
    setShowCreate(true);
    setContractForm({
      name: c.name,
      carrierName: c.carrierId || '',
      startDate: c.startDate?.split('T')[0] || '',
      endDate: c.endDate?.split('T')[0] || '',
      maxLiability: c.maxLiability?.toString() || '',
      type: c.type || 'shipping',
      terms: c.terms || '',
      contractNumber: c.contractNumber || '',
    });
  }

  function startEditCert(c: InsuranceCertificate) {
    setEditingCertId(c.id);
    setEditingContractId(null);
    setShowCreate(true);
    setCertForm({
      certificateNumber: c.certificateNumber,
      provider: c.provider,
      coverageAmount: c.coverageAmount?.toString() || '',
      effectiveDate: c.effectiveDate?.split('T')[0] || '',
      expirationDate: c.expirationDate?.split('T')[0] || '',
      policyType: c.policyType || 'cargo',
      deductible: c.deductible?.toString() || '',
    });
  }

  function handleDeleteContract(id: string) {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    deleteContractMutation.mutate(id);
  }

  function handleDeleteCert(id: string) {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    deleteCertMutation.mutate(id);
  }

  function handleContractSubmit() {
    if (editingContractId) {
      updateContractMutation.mutate({ id: editingContractId, data: contractForm });
    } else {
      createContractMutation.mutate(contractForm);
    }
  }

  function handleCertSubmit() {
    if (editingCertId) {
      updateCertMutation.mutate({ id: editingCertId, data: certForm });
    } else {
      createCertMutation.mutate(certForm);
    }
  }

  const isLoading = activeTab === 'contracts' ? contractsLoading : certsLoading;
  const isContractSaving = createContractMutation.isPending || updateContractMutation.isPending;
  const isCertSaving = createCertMutation.isPending || updateCertMutation.isPending;

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
          onClick={() => { closeForm(); setShowCreate(true); }}
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
            onClick={() => { setActiveTab(tab.id); closeForm(); }}
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

      {/* Contract Form (Create + Edit) */}
      {showCreate && activeTab === 'contracts' && (
        <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {editingContractId ? 'Edit Contract' : 'New Contract'}
            </h3>
            <button onClick={closeForm} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contract Name *</label>
              <input value={contractForm.name} onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="e.g., FedEx Ground Agreement 2025" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contract Number</label>
              <input value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="CTR-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Carrier / Partner Name</label>
              <input value={contractForm.carrierName} onChange={(e) => setContractForm({ ...contractForm, carrierName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="Carrier or partner name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contract Type</label>
              <select value={contractForm.type} onChange={(e) => setContractForm({ ...contractForm, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option value="shipping">Shipping</option>
                <option value="carrier">Carrier</option>
                <option value="liability">Liability</option>
                <option value="insurance">Insurance</option>
                <option value="service">Service Agreement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Max Liability / Coverage ($)</label>
              <input type="number" value={contractForm.maxLiability} onChange={(e) => setContractForm({ ...contractForm, maxLiability: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date *</label>
              <input type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Date</label>
              <input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Terms & Conditions</label>
              <textarea value={contractForm.terms} onChange={(e) => setContractForm({ ...contractForm, terms: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none" placeholder="Contract terms, conditions, and special provisions..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeForm} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={handleContractSubmit} disabled={!contractForm.name.trim() || !contractForm.startDate || isContractSaving} className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50">
              {isContractSaving ? 'Saving...' : editingContractId ? 'Update Contract' : 'Create Contract'}
            </button>
          </div>
        </div>
      )}

      {/* Insurance Certificate Form (Create + Edit) */}
      {showCreate && activeTab === 'insurance' && (
        <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {editingCertId ? 'Edit Insurance Certificate' : 'New Insurance Certificate'}
            </h3>
            <button onClick={closeForm} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
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
                <option value="workers_comp">Workers Comp</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Coverage Amount ($) *</label>
              <input type="number" value={certForm.coverageAmount} onChange={(e) => setCertForm({ ...certForm, coverageAmount: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="100000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Deductible ($)</label>
              <input type="number" value={certForm.deductible} onChange={(e) => setCertForm({ ...certForm, deductible: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="0" />
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
            <button onClick={closeForm} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={handleCertSubmit} disabled={!certForm.certificateNumber.trim() || !certForm.provider.trim() || isCertSaving} className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50">
              {isCertSaving ? 'Saving...' : editingCertId ? 'Update Certificate' : 'Create Certificate'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : activeTab === 'contracts' ? (
        <ContractsList contracts={contracts} search={search} onEdit={startEditContract} onDelete={handleDeleteContract} />
      ) : activeTab === 'insurance' ? (
        <InsuranceList certificates={certificates} search={search} onEdit={startEditCert} onDelete={handleDeleteCert} />
      ) : (
        <EmptyState icon={Truck} title="No tariffs uploaded" description="Upload carrier tariff documents to track liability limits and filing deadlines." />
      )}
    </div>
  );
}

function getContractStatus(contract: Contract): { label: string; className: string; icon?: typeof AlertTriangle } {
  if (!contract.isActive) {
    return { label: 'Expired', className: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' };
  }
  if (contract.endDate) {
    const daysUntilEnd = (new Date(contract.endDate).getTime() - Date.now()) / 86400000;
    if (daysUntilEnd < 0) {
      return { label: 'Expired', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' };
    }
    if (daysUntilEnd < 30) {
      return { label: 'Expiring Soon', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', icon: AlertTriangle };
    }
  }
  return { label: 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' };
}

function ContractsList({ contracts, search, onEdit, onDelete }: { contracts: Contract[]; search: string; onEdit: (c: Contract) => void; onDelete: (id: string) => void }) {
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
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contract</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Period</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Max Liability</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {filtered.map((contract) => {
            const status = getContractStatus(contract);
            return (
              <Fragment key={contract.id}>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white truncate">{contract.name}</div>
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
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1', status.className)}>
                      {status.icon && <AlertTriangle className="w-3 h-3" />}
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setExpandedId((prev) => (prev === contract.id ? null : contract.id))}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"
                        title="View details"
                      >
                        <ChevronRight className={cn('w-4 h-4 transition-transform', expandedId === contract.id && 'rotate-90')} />
                      </button>
                      <button onClick={() => onEdit(contract)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(contract.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === contract.id && (
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-6 text-sm">
                          <div><span className="text-slate-500">ID:</span> <span className="font-mono text-xs">{contract.id}</span></div>
                          <div><span className="text-slate-500">Customer ID:</span> <span className="font-mono text-xs">{contract.customerId}</span></div>
                          {contract.carrierId && <div><span className="text-slate-500">Carrier ID:</span> <span className="font-mono text-xs">{contract.carrierId}</span></div>}
                          {contract.releaseValue != null && <div><span className="text-slate-500">Release Value:</span> ${Number(contract.releaseValue).toLocaleString()}</div>}
                          <div><span className="text-slate-500">Created:</span> {new Date(contract.createdAt).toLocaleString()}</div>
                        </div>
                        {contract.terms && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Terms & Conditions</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">{contract.terms}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function InsuranceList({ certificates, search, onEdit, onDelete }: { certificates: InsuranceCertificate[]; search: string; onEdit: (c: InsuranceCertificate) => void; onDelete: (id: string) => void }) {
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
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Certificate</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Policy Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Coverage</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Expiration</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {filtered.map((cert) => {
            const isExpired = new Date(cert.expirationDate) < new Date();
            const isExpiringSoon = !isExpired && (new Date(cert.expirationDate).getTime() - Date.now()) < 30 * 86400000;
            return (
              <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{cert.provider}</div>
                  <div className="text-xs text-slate-400">#{cert.certificateNumber}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{cert.policyType.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-sm font-medium text-slate-700 dark:text-slate-300">
                  ${Number(cert.coverageAmount).toLocaleString()}
                  {cert.deductible ? <span className="text-xs text-slate-400 ml-1">(ded: ${Number(cert.deductible).toLocaleString()})</span> : null}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                  {new Date(cert.expirationDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1',
                    isExpired
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : isExpiringSoon
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  )}>
                    {isExpiringSoon && <Clock className="w-3 h-3" />}
                    {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(cert)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(cert.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
