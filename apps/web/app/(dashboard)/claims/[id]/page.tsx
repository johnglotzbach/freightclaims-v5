'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { get, put, post, del, getList, apiClient, uploadFile, fetchDocumentBlob } from '@/lib/api-client';
import { PdfViewer } from '@/components/pdf-viewer';
import { cn, getStatusBadgeClass } from '@/lib/utils';
import { formatCurrency, formatDate, formatDateTime, CLAIM_STATUSES, CARMACK_TIMELINES, daysBetween } from 'shared';
import type { Claim, ClaimComment, ClaimTask, ClaimPayment } from 'shared';
  import {
  Edit2, Mail, MoreHorizontal, ChevronRight,
  Plus, AlertTriangle, CheckCircle, Clock, Send,
  FileDown, Trash2, Eye, Download, CalendarClock,
  Activity, MessageSquare, FileText, CreditCard, ListTodo, RefreshCw, Upload, UserCheck, Zap, Bell,
  RotateCcw,
} from 'lucide-react';

type Tab = 'status' | 'transportation' | 'form-data' | 'documents' | 'tasks' | 'deadlines' | 'emails-automation' | 'transactions' | 'additional' | 'comments' | 'activity';

interface CarrierParty {
  id: string;
  name: string;
  status: string;
  filingDate?: string;
  lastEmailActivity?: string;
  amountPaid: number;
  scacCode?: string;
  referenceNumber?: string;
  acknowledgmentDate?: string;
  declinedDate?: string;
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const [isEditMode, setIsEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: claim, isLoading, error } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => get<Claim>(`/claims/${id}`),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => put(`/claims/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      toast.success('Claim status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => del(`/claims/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast.success('Claim deleted');
      router.push('/claims/list');
    },
    onError: () => toast.error('Failed to delete claim'),
  });

  const restoreMutation = useMutation({
    mutationFn: () => post(`/claims/${id}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast.success('Claim restored');
    },
    onError: () => toast.error('Failed to restore claim'),
  });

  async function handleExportPdf() {
    setMenuOpen(false);
    try {
      const res = await apiClient.get('/reports/export/claim', { responseType: 'blob', params: { claimId: id, format: 'csv' } });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim-${claim?.claimNumber || id}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Claim exported');
    } catch {
      toast.error('Export failed');
    }
  }

  function handleDeleteClaim() {
    setMenuOpen(false);
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Claim not found or you don&apos;t have access.</p>
        <Link href="/claims/list" className="text-primary-500 hover:underline">Back to Claims</Link>
      </div>
    );
  }

  const filingAge = claim.filingDate ? daysBetween(claim.filingDate, new Date().toISOString()) : 0;
  const ackDeadline = CARMACK_TIMELINES.carrierAcknowledgmentDays;
  const dispositionDeadline = CARMACK_TIMELINES.carrierDispositionDays;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'status', label: 'Claim Status' },
    { key: 'transportation', label: 'Transportation' },
    { key: 'form-data', label: 'Claim Form Data' },
    { key: 'documents', label: 'Documents', count: claim.documents?.length },
    { key: 'tasks', label: 'Tasks' },
    { key: 'deadlines', label: 'Deadlines' },
    { key: 'emails-automation', label: 'Emails & Automations' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'additional', label: 'Additional Information' },
    { key: 'comments', label: 'Comments & Activity Log' },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/claims" className="hover:text-primary-500">Dashboard</Link>
        <span>/</span>
        <Link href="/claims/list" className="hover:text-primary-500">Claims</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">{claim.claimNumber}</span>
      </nav>

      {/* Deleted banner */}
      {claim.deletedAt && (
        <div className="flex items-center justify-between px-5 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">This claim has been deleted</p>
              <p className="text-xs text-red-500 dark:text-red-400/70">Deleted on {formatDate(claim.deletedAt)}. Data is preserved for reporting. You can restore this claim at any time.</p>
            </div>
          </div>
          <button
            onClick={() => restoreMutation.mutate()}
            disabled={restoreMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {restoreMutation.isPending ? 'Restoring...' : 'Restore Claim'}
          </button>
        </div>
      )}

      {/* Claim header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Claim {claim.claimNumber}</h1>
              <span className={cn('badge text-sm', getStatusBadgeClass(claim.status))}>
                {CLAIM_STATUSES[claim.status as keyof typeof CLAIM_STATUSES] || claim.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span>Assigned to: <span className="font-medium text-slate-700 dark:text-slate-300">{(claim as any).assignedTo || 'Unassigned'}</span></span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Claim Email:</span>
              <button
                onClick={() => {
                  const email = `claim-${(claim.claimNumber || '').toLowerCase().replace(/[^a-z0-9-]/g, '')}@inbound.freightclaims.com`;
                  navigator.clipboard.writeText(email);
                  toast.success('Claim email copied');
                }}
                className="font-mono text-primary-500 hover:text-primary-600 hover:underline"
              >
                claim-{(claim.claimNumber || '').toLowerCase().replace(/[^a-z0-9-]/g, '')}@inbound.freightclaims.com
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500">Claim Age</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{filingAge} <span className="text-xs font-normal text-slate-400">days</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Filed Amount</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(claim.claimAmount ?? 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Remaining Amount</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency((claim.claimAmount ?? 0) - (claim.settledAmount ?? 0))}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsEditMode(!isEditMode)} className={cn('p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400', isEditMode && 'bg-primary-50 dark:bg-primary-950 text-primary-500')} title={isEditMode ? 'Exit edit mode' : 'Edit claim'}>
                <Edit2 className="w-4 h-4" />
              </button>
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" title="More actions">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-full mt-1 z-20 w-48 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                      <button onClick={handleExportPdf} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <FileDown className="w-4 h-4" /> Export Claim
                      </button>
                      <button onClick={handleDeleteClaim} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 className="w-4 h-4" /> Delete Claim
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compliance alerts */}
        {filingAge > 0 && !claim.acknowledgmentDate && filingAge >= ackDeadline - 5 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Carmack Alert: {filingAge >= ackDeadline
                ? `Carrier acknowledgment is ${filingAge - ackDeadline} days overdue!`
                : `Carrier acknowledgment due in ${ackDeadline - filingAge} days`
              }
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="flex gap-0 -mb-px min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 bg-emerald-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'status' && <StatusTab claim={claim} claimId={id} />}
        {activeTab === 'transportation' && <TransportationTab claim={claim} />}
        {activeTab === 'form-data' && <FormDataTab claim={claim} claimId={id} />}
        {activeTab === 'documents' && <DocumentsTab documents={claim.documents || []} claimId={id} />}
        {activeTab === 'tasks' && <TasksTab tasks={claim.tasks || []} claimId={id} />}
        {activeTab === 'deadlines' && <DeadlinesTab claimId={id} />}
        {activeTab === 'emails-automation' && <EmailsAutomationTab claimId={id} />}
        {activeTab === 'transactions' && <TransactionsTab claim={claim} />}
        {activeTab === 'additional' && <AdditionalInfoTab claim={claim} />}
        {activeTab === 'comments' && <CommentsActivityTab comments={claim.comments || []} timeline={claim.timeline || []} claimId={id} />}
        {activeTab === 'activity' && <ActivityTab claimId={id} />}
      </div>
    </div>
  );
}

function StatusTab({ claim, claimId }: { claim: Claim; claimId: string }) {
  const queryClient = useQueryClient();
  const [ackDate, setAckDate] = useState(claim.acknowledgmentDate ? claim.acknowledgmentDate.slice(0, 10) : '');
  const refFromIdentifiers = claim.identifiers?.find((i: any) => i.type === 'ref')?.value;
  const [refNo, setRefNo] = useState(refFromIdentifiers || (claim as any).referenceNumber || '');
  useEffect(() => {
    setAckDate(claim.acknowledgmentDate ? claim.acknowledgmentDate.slice(0, 10) : '');
    const refVal = claim.identifiers?.find((i: any) => i.type === 'ref')?.value || (claim as any).referenceNumber || '';
    setRefNo(refVal);
  }, [claim.id, claim.acknowledgmentDate, claim.identifiers]);
  const [saving, setSaving] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: { acknowledgmentDate?: string }) => put(`/claims/${claimId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      toast.success('Claim updated');
      setSaving(false);
    },
    onError: () => {
      toast.error('Failed to update');
      setSaving(false);
    },
  });

  const refMutation = useMutation({
    mutationFn: (value: string) => post(`/claims/${claimId}/identifiers`, { type: 'ref', value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      toast.success('Reference number updated');
      setSaving(false);
    },
    onError: () => {
      toast.error('Failed to update reference number');
      setSaving(false);
    },
  });

  function handleSaveAck() {
    setSaving(true);
    updateMutation.mutate({
      acknowledgmentDate: ackDate ? `${ackDate}T00:00:00.000Z` : undefined,
    });
  }

  function handleSaveRef() {
    setSaving(true);
    refMutation.mutate(refNo);
  }

  const carrierParties: CarrierParty[] = (claim.parties || [])
    .filter((p: any) => p.type === 'carrier')
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      status: 'Pending',
      filingDate: claim.filingDate,
      lastEmailActivity: claim.updatedAt,
      amountPaid: 0,
      scacCode: p.scacCode,
    }));

  if (carrierParties.length === 0) {
    carrierParties.push({
      id: 'default',
      name: 'N/A',
      status: 'Pending',
      filingDate: claim.filingDate,
      lastEmailActivity: claim.updatedAt,
      amountPaid: 0,
      scacCode: undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Carrier Claim Party table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Carrier Claim Party</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Carrier</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Filing Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Last Email Activity</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Amount Paid</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {carrierParties.map(party => (
                <tr key={party.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{party.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 font-medium">
                      {party.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                    {party.filingDate ? formatDate(party.filingDate) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{party.lastEmailActivity || '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(party.amountPaid)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        const newStatus = party.status === 'invoiced' ? 'pending' : 'invoiced';
                        put(`/claims/${claimId}/parties/${party.id}`, { status: newStatus })
                          .then(() => { queryClient.invalidateQueries({ queryKey: ['claim', claimId] }); toast.success(`Party status updated to ${newStatus}`); })
                          .catch(() => toast.error('Failed to update status'));
                      }}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                    >
                      {party.status === 'invoiced' ? 'Mark Pending' : 'Mark Invoiced'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reference Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Acknowledgment/Declined Date</label>
          <input
            type="date"
            value={ackDate}
            onChange={(e) => setAckDate(e.target.value)}
            onBlur={handleSaveAck}
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
        <div className="card p-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Claim Reference No</label>
          <input
            type="text"
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            onBlur={handleSaveRef}
            placeholder="Enter reference number..."
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
      </div>
      {(saving || updateMutation.isPending || refMutation.isPending) && (
        <p className="text-xs text-slate-500">Saving...</p>
      )}
    </div>
  );
}

function TransportationTab({ claim }: { claim: Claim }) {
  const bolNumber = claim.identifiers?.find((i: any) => i.type === 'bol')?.value || '';
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Shipment Details</h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="PRO Number" value={claim.proNumber || 'N/A'} mono />
          <DetailRow label="BOL Number" value={bolNumber || 'N/A'} mono />
          <DetailRow label="Ship Date" value={claim.shipDate ? formatDate(claim.shipDate) : 'N/A'} />
          <DetailRow label="Delivery Date" value={claim.deliveryDate ? formatDate(claim.deliveryDate) : 'N/A'} />
          <DetailRow label="Origin" value={(claim as any).originCity ? `${(claim as any).originCity}, ${(claim as any).originState}` : 'N/A'} />
          <DetailRow label="Destination" value={(claim as any).destinationCity ? `${(claim as any).destinationCity}, ${(claim as any).destinationState}` : 'N/A'} />
        </dl>
      </div>
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Carrier Information</h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="Carrier" value={(claim.parties || []).find((p: any) => p.type === 'carrier')?.name || 'N/A'} />
          <DetailRow label="SCAC Code" value={(claim.parties || []).find((p: any) => p.type === 'carrier')?.scacCode || 'N/A'} mono />
          <DetailRow label="Total Weight" value={(claim as any).totalWeight ? `${(claim as any).totalWeight} lbs` : 'N/A'} />
          <DetailRow label="Total Pieces" value={(claim as any).totalPieces?.toString() || 'N/A'} />
          <DetailRow label="Freight Terms" value={(claim as any).freightTerms || 'Prepaid'} />
        </dl>
      </div>
    </div>
  );
}

function FormDataTab({ claim, claimId }: { claim: Claim; claimId: string }) {
  const queryClient = useQueryClient();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [pForm, setPForm] = useState({ description: '', quantity: '1', weight: '', value: '', damageType: '' });

  const addProductMut = useMutation({
    mutationFn: (data: any) => post(`/claims/${claimId}/products`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim', claimId] }); setShowAddProduct(false); resetPForm(); toast.success('Product added'); },
    onError: () => toast.error('Failed to add product'),
  });

  const updateProductMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/claims/${claimId}/products/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim', claimId] }); setEditProductId(null); toast.success('Product updated'); },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteProductMut = useMutation({
    mutationFn: (id: string) => del(`/claims/${claimId}/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim', claimId] }); toast.success('Product deleted'); },
    onError: () => toast.error('Failed to delete product'),
  });

  function resetPForm() { setPForm({ description: '', quantity: '1', weight: '', value: '', damageType: '' }); }
  function startEditProduct(p: any) {
    setEditProductId(p.id);
    setPForm({ description: p.description || '', quantity: String(p.quantity ?? 1), weight: String(p.weight ?? ''), value: String(p.value ?? ''), damageType: p.damageType || '' });
  }
  function submitProduct() {
    const data = { description: pForm.description, quantity: Number(pForm.quantity) || 1, weight: pForm.weight ? Number(pForm.weight) : undefined, claimAmount: pForm.value ? Number(pForm.value) : undefined, damageType: pForm.damageType || undefined };
    if (editProductId) { updateProductMut.mutate({ id: editProductId, data }); }
    else { addProductMut.mutate(data); }
  }

  const productForm = (
    <tr className="bg-primary-50/50 dark:bg-primary-500/5">
      <td className="px-4 py-2"><input value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))} className="input text-xs w-full" placeholder="Description *" /></td>
      <td className="px-4 py-2"><input value={pForm.quantity} onChange={e => setPForm(f => ({ ...f, quantity: e.target.value }))} className="input text-xs w-16" type="number" min="1" /></td>
      <td className="px-4 py-2"><input value={pForm.weight} onChange={e => setPForm(f => ({ ...f, weight: e.target.value }))} className="input text-xs w-20" type="number" placeholder="lbs" /></td>
      <td className="px-4 py-2"><input value={pForm.value} onChange={e => setPForm(f => ({ ...f, value: e.target.value }))} className="input text-xs w-24" type="number" placeholder="$" /></td>
      <td className="px-4 py-2">
        <select value={pForm.damageType} onChange={e => setPForm(f => ({ ...f, damageType: e.target.value }))} className="input text-xs">
          <option value="">Select...</option>
          <option value="damage">Damage</option>
          <option value="shortage">Shortage</option>
          <option value="loss">Loss</option>
          <option value="contamination">Contamination</option>
          <option value="theft">Theft</option>
        </select>
      </td>
      <td className="px-4 py-2 text-right">
        <button onClick={submitProduct} disabled={!pForm.description} className="text-xs bg-primary-500 text-white px-2 py-1 rounded font-medium disabled:opacity-50 mr-1">{editProductId ? 'Save' : 'Add'}</button>
        <button onClick={() => { setShowAddProduct(false); setEditProductId(null); resetPForm(); }} className="text-xs text-slate-500 px-2 py-1">Cancel</button>
      </td>
    </tr>
  );

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Claim Information</h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="Claim Number" value={claim.claimNumber} />
          <DetailRow label="Claim Type" value={(claim.claimType || 'N/A').replace('_', ' ')} />
          <DetailRow label="Status" value={CLAIM_STATUSES[claim.status as keyof typeof CLAIM_STATUSES] || claim.status} />
          <DetailRow label="Filed Amount" value={formatCurrency(claim.claimAmount)} />
          {claim.settledAmount && <DetailRow label="Settled Amount" value={formatCurrency(claim.settledAmount)} />}
          <DetailRow label="Filing Date" value={claim.filingDate ? formatDate(claim.filingDate) : 'N/A'} />
        </dl>
      </div>
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Dates & Timeline</h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="Ship Date" value={claim.shipDate ? formatDate(claim.shipDate) : 'N/A'} />
          <DetailRow label="Delivery Date" value={claim.deliveryDate ? formatDate(claim.deliveryDate) : 'N/A'} />
          <DetailRow label="Acknowledgment Date" value={claim.acknowledgmentDate ? formatDate(claim.acknowledgmentDate) : 'Pending'} />
          <DetailRow label="Created" value={claim.createdAt ? formatDateTime(claim.createdAt) : 'N/A'} />
          <DetailRow label="Last Updated" value={claim.updatedAt ? formatDateTime(claim.updatedAt) : 'N/A'} />
        </dl>
      </div>

      <div className="card overflow-hidden md:col-span-2">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Products / Line Items</h3>
          <button onClick={() => { setShowAddProduct(true); setEditProductId(null); resetPForm(); }} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Description</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Qty</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Weight</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Value</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Damage Type</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {claim.products?.map((p) => editProductId === p.id ? productForm : (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium">{p.description}</td>
                <td className="px-4 py-3">{p.quantity}</td>
                <td className="px-4 py-3">{p.weight ? `${p.weight} lbs` : '-'}</td>
                <td className="px-4 py-3">{p.value ? formatCurrency(p.value) : '-'}</td>
                <td className="px-4 py-3 capitalize">{p.damageType || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEditProduct(p)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => { if (confirm('Delete this product?')) deleteProductMut.mutate(p.id); }} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
            {showAddProduct && !editProductId && productForm}
            {(!claim.products || claim.products.length === 0) && !showAddProduct && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No products yet. Click "Add Product" to add line items.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {claim.description && (
        <div className="card p-6 md:col-span-2">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{claim.description}</p>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ documents, claimId }: { documents: Claim['documents']; claimId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string; type?: string } | null>(null);

  async function handleViewDoc(doc: any) {
    try {
      const { blobUrl, contentType } = await fetchDocumentBlob(doc.id);
      setViewingDoc({ url: blobUrl, name: doc.documentName, type: contentType });
    } catch { toast.error('Failed to load preview'); }
  }

  async function handleDownloadDoc(doc: any) {
    try {
      const { blobUrl } = await fetchDocumentBlob(doc.id);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.documentName || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch { toast.error('Failed to download'); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('claimId', claimId);
      const rd = await uploadFile('/documents/upload', formData);
      const uploaded = rd?.data?.uploaded || rd?.uploaded || (Array.isArray(rd) ? rd : [rd]);
      toast.success(`${files.length} document(s) uploaded`);
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });

      for (const doc of uploaded) {
        if (doc?.id) {
          try { await post(`/documents/${doc.id}/process`, {}); } catch {}
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{documents?.length || 0} document(s)</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt" className="hidden" onChange={handleUpload} />
      </div>
      {!documents?.length ? (
        <EmptyState message="No documents uploaded yet" action="Upload Document" onActionClick={() => fileInputRef.current?.click()} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Document Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Size</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Uploaded</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">AI</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-primary-500">{doc.documentName}</td>
                  <td className="px-4 py-3 hidden sm:table-cell capitalize text-xs text-slate-500">{doc.mimeType || '-'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    {(doc as any).aiProcessingStatus === 'completed' ? (
                      <span className="text-emerald-500 font-medium">Processed</span>
                    ) : (doc as any).aiProcessingStatus === 'processing' ? (
                      <span className="text-amber-500 font-medium">Processing...</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleViewDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Preview"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleDownloadDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Download"><Download className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {viewingDoc && (
        <PdfViewer
          url={viewingDoc.url}
          fileName={viewingDoc.name}
          contentType={viewingDoc.type}
          onClose={() => { URL.revokeObjectURL(viewingDoc.url); setViewingDoc(null); }}
        />
      )}
    </div>
  );
}

function TasksTab({ tasks, claimId }: { tasks: ClaimTask[]; claimId: string }) {
  const queryClient = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskReminder, setTaskReminder] = useState('');
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const { data: liveTasks = tasks } = useQuery({
    queryKey: ['claim-tasks', claimId],
    queryFn: () => getList<ClaimTask>(`/claims/${claimId}/tasks`),
    initialData: tasks,
  });

  const addTaskMutation = useMutation({
    mutationFn: (data: any) => post(`/claims/${claimId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claim-tasks', claimId] });
      setShowTaskForm(false);
      setTaskTitle(''); setTaskDescription(''); setTaskPriority('medium'); setTaskDueDate(''); setTaskReminder('');
      toast.success('Task added');
    },
    onError: () => toast.error('Failed to add task'),
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => put(`/claims/${claimId}/tasks/${taskId}`, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claim-tasks', claimId] });
      toast.success('Task completed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => del(`/claims/${claimId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claim-tasks', claimId] });
      toast.success('Task deleted');
    },
  });

  function handleSubmitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) { toast.error('Title is required'); return; }
    const reminderMap: Record<string, number> = { 'at_event': 0, '1_day': 1440, '2_days': 2880, '3_days': 4320, '1_week': 10080, '2_weeks': 20160, '1_month': 43200 };
    addTaskMutation.mutate({
      title: taskTitle.trim(), description: taskDescription.trim() || undefined,
      priority: taskPriority, dueDate: taskDueDate || undefined,
      reminderMinutes: taskReminder ? reminderMap[taskReminder] ?? undefined : undefined,
    });
  }

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };

  const nowMs = Date.now();
  const outstanding = liveTasks.filter((t: any) => t.status !== 'completed' && (!t.dueDate || new Date(t.dueDate).getTime() >= nowMs));
  const overdue = liveTasks.filter((t: any) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate).getTime() < nowMs);
  const completed = liveTasks.filter((t: any) => t.status === 'completed');

  const firstOfMonth = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDay = firstOfMonth.getDay();
  const monthName = firstOfMonth.toLocaleString('default', { month: 'short' });
  const calDays: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  const tasksByDay = new Map<number, string>();
  liveTasks.forEach((t: any) => {
    if (!t.dueDate) return;
    const d = new Date(t.dueDate);
    if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
      const day = d.getDate();
      if (t.status === 'completed') { if (!tasksByDay.has(day)) tasksByDay.set(day, 'green'); }
      else if (d.getTime() < nowMs) tasksByDay.set(day, 'red');
      else tasksByDay.set(day, 'blue');
    }
  });

  function renderTaskCard(task: any) {
    const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < nowMs && task.status !== 'completed';
    return (
      <div key={task.id} className={cn('card p-3 flex items-start gap-3', isOverdue && 'border-l-3 border-l-red-500')}>
        {task.status !== 'completed' && (
          <button onClick={() => completeMutation.mutate(task.id)} className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex-shrink-0 flex items-center justify-center transition-colors">
            <CheckCircle className="w-3 h-3 text-transparent hover:text-emerald-500" />
          </button>
        )}
        {task.status === 'completed' && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full', priorityColors[task.priority] || priorityColors.medium)}>{task.priority}</span>
            {isOverdue && <span className="text-[10px] font-bold text-red-600">OVERDUE</span>}
          </div>
          <h4 className={cn('text-sm font-medium', task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white')}>{task.title}</h4>
          {task.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>}
          {task.dueDate && <p className="text-xs text-slate-400 mt-1">Due: {formatDate(task.dueDate)}</p>}
          {task.completedAt && <p className="text-xs text-emerald-500 mt-1">Completed: {formatDate(task.completedAt)}</p>}
        </div>
        <button onClick={() => { if (confirm('Delete task?')) deleteMutation.mutate(task.id); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-1">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">&lt;</button>
            <span className="text-sm font-semibold">{monthName} {calYear}</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-0 text-center text-[10px] font-semibold text-slate-400 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0 text-center text-xs">
            {calDays.map((d, i) => {
              if (d === null) return <div key={`e${i}`} className="h-8" />;
              const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
              const dotColor = tasksByDay.get(d);
              return (
                <div key={d} className={cn('h-8 flex flex-col items-center justify-center rounded-lg relative', isToday && 'ring-2 ring-primary-500')}>
                  <span className="text-slate-700 dark:text-slate-300">{d}</span>
                  {dotColor && <div className={cn('w-1.5 h-1.5 rounded-full absolute bottom-0.5', dotColor === 'red' ? 'bg-red-500' : dotColor === 'green' ? 'bg-emerald-500' : 'bg-blue-500')} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Lists */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tasks</h3>
          <button onClick={() => setShowTaskForm(!showTaskForm)} className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"><Plus className="w-3.5 h-3.5" /> New Task</button>
        </div>

        {showTaskForm && (
          <form onSubmit={handleSubmitTask} className="card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Task title" /></div>
              <div className="col-span-2"><textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Description (optional)" /></div>
              <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
              <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              <select value={taskReminder} onChange={e => setTaskReminder(e.target.value)} className="col-span-2 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">No reminder</option><option value="at_event">At time of event</option>
                <option value="1_day">1 day before</option><option value="2_days">2 days before</option><option value="3_days">3 days before</option>
                <option value="1_week">1 week before</option><option value="2_weeks">2 weeks before</option><option value="1_month">1 month before</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addTaskMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{addTaskMutation.isPending ? 'Adding...' : 'Add Task'}</button>
              <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 border rounded-lg text-sm text-slate-600 dark:text-slate-400">Cancel</button>
            </div>
          </form>
        )}

        {overdue.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">Overdue Tasks</h4>
            <div className="space-y-2">{overdue.map(renderTaskCard)}</div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Outstanding Tasks</h4>
          {outstanding.length === 0 ? <p className="text-xs text-slate-400">There aren&apos;t any tasks.</p> : <div className="space-y-2">{outstanding.map(renderTaskCard)}</div>}
        </div>

        {completed.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 uppercase mb-2">Completed Tasks</h4>
            <div className="space-y-2">{completed.map(renderTaskCard)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ClaimDeadlineItem {
  id: string;
  type: string;
  dueDate: string;
  reminderDays: number[];
  status: string;
}

const DEADLINE_TYPES = [
  { key: 'filing_deadline', label: 'Filing Deadline' },
  { key: 'response_deadline', label: 'Response Deadline' },
  { key: 'statute_of_limitations', label: 'Statute of Limitations' },
  { key: 'custom', label: 'Custom' },
];

function DeadlinesTab({ claimId }: { claimId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [dlType, setDlType] = useState('filing_deadline');
  const [dlDate, setDlDate] = useState('');
  const [dlReminder, setDlReminder] = useState('7');

  const { data: deadlines = [] } = useQuery({
    queryKey: ['claim-deadlines', claimId],
    queryFn: () => getList<ClaimDeadlineItem>(`/claims/${claimId}/deadlines`),
  });

  const addMutation = useMutation({
    mutationFn: (data: { type: string; dueDate: string; reminderDays: number[] }) =>
      post(`/claims/${claimId}/deadlines`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-deadlines', claimId] });
      setShowForm(false);
      setDlType('filing_deadline');
      setDlDate('');
      setDlReminder('7');
      toast.success('Deadline added');
    },
    onError: () => toast.error('Failed to add deadline'),
  });

  const deleteMutation = useMutation({
    mutationFn: (did: string) => del(`/claims/${claimId}/deadlines/${did}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-deadlines', claimId] });
      toast.success('Deadline removed');
    },
    onError: () => toast.error('Failed to remove deadline'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dlDate) { toast.error('Due date is required'); return; }
    const reminderDays = dlReminder.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    addMutation.mutate({ type: dlType, dueDate: `${dlDate}T00:00:00.000Z`, reminderDays });
  }

  const now = new Date();

  function deadlineStatus(dl: ClaimDeadlineItem) {
    const due = new Date(dl.dueDate);
    if (dl.status === 'completed') return { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' };
    if (due < now) return { label: 'Overdue', cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' };
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' };
    return { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary-500" /> Deadlines ({deadlines.length})
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-semibold">
          <Plus className="w-4 h-4" /> Add Deadline
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">New Deadline</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
              <select value={dlType} onChange={e => setDlType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                {DEADLINE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
              <input type="date" value={dlDate} onChange={e => setDlDate(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reminder (days before)</label>
              <input type="text" value={dlReminder} onChange={e => setDlReminder(e.target.value)} placeholder="7, 3, 1" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={addMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{addMutation.isPending ? 'Adding...' : 'Add Deadline'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          </div>
        </form>
      )}

      {deadlines.length === 0 && !showForm ? (
        <EmptyState message="No deadlines set for this claim." action="Add Deadline" onActionClick={() => setShowForm(true)} />
      ) : (
        <div className="space-y-2">
          {deadlines.map(dl => {
            const st = deadlineStatus(dl);
            const isOverdue = new Date(dl.dueDate) < now && dl.status !== 'completed';
            return (
              <div key={dl.id} className={cn('card p-4 flex items-center justify-between gap-4', isOverdue && 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', st.cls)}>{st.label}</span>
                    <span className="text-xs text-slate-500 capitalize">{(dl.type || '').replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Due: {formatDate(dl.dueDate)}</p>
                  {dl.reminderDays?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">Reminders: {dl.reminderDays.join(', ')} days before</p>
                  )}
                </div>
                <button onClick={() => deleteMutation.mutate(dl.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500" title="Remove deadline">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmailsAutomationTab({ claimId }: { claimId: string }) {
  const { data: emails = [] } = useQuery({
    queryKey: ['claim-emails', claimId],
    queryFn: () => getList<{ id: string; subject?: string; from?: string; date?: string; createdAt?: string; isInbound?: boolean }>('/email/claim/' + claimId),
  });
  const { data: automations = [] } = useQuery({
    queryKey: ['claim-automations', claimId],
    queryFn: () => getList<{ id: string; name?: string; status?: string; executedAt?: string; scheduledFor?: string; type?: string }>('/automation/rules'),
  });

  const emailList = emails.map((e) => ({
    id: e.id,
    subject: e.subject || '(No subject)',
    from: e.from || '',
    date: e.date || e.createdAt?.slice(0, 10) || '',
    isInbound: e.isInbound ?? false,
  }));
  const autoList = automations.map((a) => ({
    id: a.id,
    name: a.name || 'Rule',
    status: a.status || 'pending',
    executedAt: a.executedAt,
    scheduledFor: a.scheduledFor,
    type: a.type || 'email',
  }));

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Email Thread ({emailList.length})</h3>
          <Link href={`/claims/${claimId}/email`} className="flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium">
            <Send className="w-4 h-4" /> Open Email
          </Link>
        </div>
        <div className="space-y-2">
          {emailList.map(email => (
            <Link key={email.id} href={`/claims/${claimId}/email`} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold', email.isInbound ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600')}>
                {email.isInbound ? 'IN' : 'OUT'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{email.subject}</p>
                <p className="text-xs text-slate-500">{email.from} · {email.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Automation Workflows</h3>
          <Link href="/automation" className="text-xs text-primary-500 font-medium">Configure</Link>
        </div>
        <div className="space-y-2">
          {autoList.map(auto => (
            <div key={auto.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full', auto.status === 'completed' ? 'bg-emerald-500' : auto.status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300')} />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{auto.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{auto.type} · {auto.status === 'completed' ? `Executed ${auto.executedAt}` : `Scheduled ${auto.scheduledFor}`}</p>
                </div>
              </div>
              <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', auto.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : auto.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{auto.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TX_TYPES = [
  { key: 'all', label: 'All Transactions' },
  { key: 'inbound_payment', label: 'Inbound' },
  { key: 'outbound_payment', label: 'Outbound' },
  { key: 'concession', label: 'Non-cash' },
  { key: 'direct_to_customer', label: 'Direct to Customer' },
  { key: 'pending', label: 'Pending' },
] as const;

const TX_TYPE_OPTIONS = [
  { value: 'inbound_payment', label: 'Inbound Payment' },
  { value: 'outbound_payment', label: 'Outbound Payment' },
  { value: 'concession', label: 'Concession / Carrier Offset' },
  { value: 'write_off', label: 'Write-off' },
  { value: 'direct_to_customer', label: 'Direct Payment to Customer' },
];

function TransactionsTab({ claim }: { claim: Claim }) {
  const queryClient = useQueryClient();
  const [txFilter, setTxFilter] = useState('all');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [txType, setTxType] = useState('inbound_payment');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txRef, setTxRef] = useState('');
  const [txMethod, setTxMethod] = useState('');
  const [txCheck, setTxCheck] = useState('');
  const [txGl, setTxGl] = useState('');
  const [txPayee, setTxPayee] = useState('');
  const [txVendor, setTxVendor] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txPartyId, setTxPartyId] = useState('');
  const [txStatus, setTxStatus] = useState('cleared');
  const [txExpected, setTxExpected] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['payment-summary', claim.id],
    queryFn: () => get<any>(`/claims/${claim.id}/payments/summary`),
  });

  const payments: any[] = claim.payments || [];
  const filtered = txFilter === 'all'
    ? payments
    : txFilter === 'pending'
      ? payments.filter((p: any) => p.paymentStatus === 'pending')
      : payments.filter((p: any) => (p.transactionType || p.type) === txFilter);

  const addMutation = useMutation({
    mutationFn: (data: any) => post(`/claims/${claim.id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-summary', claim.id] });
      setShowPaymentForm(false);
      resetForm();
      toast.success('Transaction logged');
    },
    onError: () => toast.error('Failed to log transaction'),
  });

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => del(`/claims/${claim.id}/payments/${pid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-summary', claim.id] });
      toast.success('Transaction deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const [editingPayment, setEditingPayment] = useState<any>(null);

  const editMutation = useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: any }) => put(`/claims/${claim.id}/payments/${paymentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-summary', claim.id] });
      setEditingPayment(null);
      toast.success('Transaction updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  function startEdit(p: any) {
    setEditingPayment({
      id: p.id,
      transactionType: p.transactionType || p.type || 'inbound_payment',
      amount: String(p.amount || ''),
      paymentStatus: p.paymentStatus || 'cleared',
      method: p.method || '',
      checkNumber: p.checkNumber || '',
      glCode: p.glCode || '',
      payeeName: p.payeeName || '',
      notes: p.notes || '',
      claimPartyId: p.claimPartyId || '',
      receivedAt: p.receivedAt ? new Date(p.receivedAt).toISOString().slice(0, 10) : '',
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPayment) return;
    const amt = parseFloat(editingPayment.amount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
    editMutation.mutate({
      paymentId: editingPayment.id,
      data: {
        amount: amt,
        transactionType: editingPayment.transactionType,
        paymentStatus: editingPayment.paymentStatus,
        method: editingPayment.method || undefined,
        checkNumber: editingPayment.checkNumber || undefined,
        glCode: editingPayment.glCode || undefined,
        payeeName: editingPayment.payeeName || undefined,
        notes: editingPayment.notes || undefined,
        claimPartyId: editingPayment.claimPartyId || undefined,
        receivedAt: editingPayment.receivedAt || undefined,
      },
    });
  }

  function resetForm() {
    setTxType('inbound_payment'); setTxAmount(''); setTxRef(''); setTxMethod(''); setTxCheck('');
    setTxGl(''); setTxPayee(''); setTxVendor(''); setTxNotes(''); setTxPartyId(''); setTxStatus('cleared'); setTxExpected('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    addMutation.mutate({
      amount, transactionType: txType, direction: txType.includes('outbound') || txType === 'direct_to_customer' ? 'outbound' : 'inbound',
      paymentStatus: txStatus, method: txMethod || undefined, reference: txRef || undefined,
      checkNumber: txCheck || undefined, glCode: txGl || undefined, payeeName: txPayee || undefined,
      vendorName: txVendor || undefined, notes: txNotes || undefined, claimPartyId: txPartyId || undefined,
      receivedAt: txDate || undefined, expectedDate: txExpected || undefined,
    });
  }

  const parties = claim.parties || [];
  const s = summary || {};

  return (
    <div className="space-y-6">
      {s.hasPendingTransactions && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="font-medium text-amber-800 dark:text-amber-300">Pending transaction must be completed before closing this claim.</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 text-center"><p className="text-[10px] text-slate-500 uppercase font-semibold">Filed</p><p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(s.filedAmount || claim.claimAmount || 0)}</p></div>
        <div className="card p-3 text-center"><p className="text-[10px] text-slate-500 uppercase font-semibold">Inbound</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(s.totalInbound || 0)}</p></div>
        <div className="card p-3 text-center"><p className="text-[10px] text-slate-500 uppercase font-semibold">Outbound</p><p className="text-lg font-bold text-red-500">{formatCurrency(s.totalOutbound || 0)}</p></div>
        <div className="card p-3 text-center"><p className="text-[10px] text-slate-500 uppercase font-semibold">Funds Available</p><p className="text-lg font-bold text-primary-600">{formatCurrency(s.fundsAvailable || 0)}</p></div>
      </div>

      {/* Per-party summary */}
      {s.parties && s.parties.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-slate-500 uppercase">Per-Party Summary</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-3 py-2 font-semibold text-slate-500">Party</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-500">Inbound</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-500">Outbound</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-500">Concession</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-500">Write-off</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-500">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {s.parties.map((p: any) => {
                  const ps = s.perParty?.[p.id] || {};
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-medium">{p.name} <span className="text-slate-400 capitalize">({p.type})</span></td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(ps.inbound || 0)}</td>
                      <td className="px-3 py-2 text-right text-red-500">{formatCurrency(ps.outbound || 0)}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{formatCurrency(ps.concession || 0)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(ps.writeOff || 0)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(ps.balance || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {TX_TYPES.map(t => (
            <button key={t.key} onClick={() => setTxFilter(t.key)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                txFilter === t.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-xs font-semibold"><Plus className="w-3.5 h-3.5" /> Log Transaction</button>
      </div>

      {showPaymentForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">New Transaction</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Type</label>
              <select value={txType} onChange={e => setTxType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                {TX_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
              <input type="number" step="0.01" min="0" value={txAmount} onChange={e => setTxAmount(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Party</label>
              <select value={txPartyId} onChange={e => setTxPartyId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">Unassigned</option>
                {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={txStatus} onChange={e => setTxStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="cleared">Cleared</option>
                <option value="pending">Pending</option>
                <option value="voided">Voided</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Method</label>
              <select value={txMethod} onChange={e => setTxMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">Select</option>
                <option value="check">Check</option>
                <option value="ach">ACH</option>
                <option value="wire">Wire</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date Received</label>
              <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Check Number</label>
              <input type="text" value={txCheck} onChange={e => setTxCheck(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">GL Code</label>
              <input type="text" value={txGl} onChange={e => setTxGl(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payee / Vendor</label>
              <input type="text" value={txPayee} onChange={e => setTxPayee(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            {txStatus === 'pending' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Expected Date</label>
                <input type="date" value={txExpected} onChange={e => setTxExpected(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={addMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{addMutation.isPending ? 'Saving...' : 'Save Transaction'}</button>
            <button type="button" onClick={() => { setShowPaymentForm(false); resetForm(); }} className="px-4 py-2 border rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          </div>
        </form>
      )}

      {editingPayment && (
        <form onSubmit={handleEditSubmit} className="card p-4 space-y-3 border-2 border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Edit Transaction</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Type</label>
              <select value={editingPayment.transactionType} onChange={e => setEditingPayment({ ...editingPayment, transactionType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                {TX_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
              <input type="number" step="0.01" min="0" value={editingPayment.amount} onChange={e => setEditingPayment({ ...editingPayment, amount: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Party</label>
              <select value={editingPayment.claimPartyId} onChange={e => setEditingPayment({ ...editingPayment, claimPartyId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">Unassigned</option>
                {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={editingPayment.paymentStatus} onChange={e => setEditingPayment({ ...editingPayment, paymentStatus: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="cleared">Cleared</option><option value="pending">Pending</option><option value="voided">Voided</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Check #</label>
              <input type="text" value={editingPayment.checkNumber} onChange={e => setEditingPayment({ ...editingPayment, checkNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">GL Code</label>
              <input type="text" value={editingPayment.glCode} onChange={e => setEditingPayment({ ...editingPayment, glCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input type="date" value={editingPayment.receivedAt} onChange={e => setEditingPayment({ ...editingPayment, receivedAt: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <textarea value={editingPayment.notes} onChange={e => setEditingPayment({ ...editingPayment, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={editMutation.isPending} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{editMutation.isPending ? 'Saving...' : 'Update Transaction'}</button>
            <button type="button" onClick={() => setEditingPayment(null)} className="px-4 py-2 border rounded-lg text-sm text-slate-600 dark:text-slate-400">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Party</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Check #</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {filtered.map((p: any) => {
              const tt = p.transactionType || p.type || 'inbound_payment';
              const partyName = parties.find((pp: any) => pp.id === p.claimPartyId)?.name;
              const isOut = tt.includes('outbound') || tt === 'direct_to_customer' || tt === 'write_off';
              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                      isOut ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    )}>{tt.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">{partyName || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-slate-500">{p.checkNumber || p.reference || '—'}</td>
                  <td className={cn('px-4 py-3 font-semibold', isOut ? 'text-red-600' : 'text-emerald-600')}>{isOut ? '-' : '+'}{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase',
                      p.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' : p.paymentStatus === 'voided' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                    )}>{p.paymentStatus || 'cleared'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{p.receivedAt ? formatDate(p.receivedAt) : formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-slate-400 hover:text-blue-500"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm('Delete this transaction?')) deleteMutation.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">No transactions in this category</div>
        )}
      </div>
    </div>
  );
}

function AdditionalInfoTab({ claim }: { claim: Claim }) {
  const queryClient = useQueryClient();
  const claimId = claim.id;
  const [showParentSearch, setShowParentSearch] = useState(false);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [showLinkChild, setShowLinkChild] = useState(false);
  const [childSearchTerm, setChildSearchTerm] = useState('');

  const { data: childClaims = [] } = useQuery({
    queryKey: ['child-claims', claimId],
    queryFn: () => getList<any>(`/claims?parentClaimId=${claimId}&limit=50`),
    enabled: !!claimId,
  });

  const { data: parentSearchResults = [] } = useQuery({
    queryKey: ['claim-search-parent', parentSearchTerm],
    queryFn: () => getList<any>(`/claims?search=${parentSearchTerm}&limit=10`),
    enabled: parentSearchTerm.length >= 2,
  });

  const { data: childSearchResults = [] } = useQuery({
    queryKey: ['claim-search-child', childSearchTerm],
    queryFn: () => getList<any>(`/claims?search=${childSearchTerm}&limit=10`),
    enabled: childSearchTerm.length >= 2,
  });

  const setParentMutation = useMutation({
    mutationFn: (parentId: string) => put(`/claims/${claimId}`, { parentClaimId: parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      setShowParentSearch(false);
      setParentSearchTerm('');
      toast.success('Parent claim linked');
    },
    onError: () => toast.error('Failed to set parent claim'),
  });

  const linkChildMutation = useMutation({
    mutationFn: (childId: string) => put(`/claims/${childId}`, { parentClaimId: claimId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-claims', claimId] });
      setShowLinkChild(false);
      setChildSearchTerm('');
      toast.success('Child claim linked');
    },
    onError: () => toast.error('Failed to link child claim'),
  });

  const removeParentMutation = useMutation({
    mutationFn: () => put(`/claims/${claimId}`, { parentClaimId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      toast.success('Parent claim unlinked');
    },
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <PartiesCard claim={claim} claimId={claimId} />

      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Payment History</h3>
        {claim.payments && claim.payments.length > 0 ? (
          <div className="space-y-2">
            {claim.payments.map((p: ClaimPayment) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div>
                  <p className="text-sm font-medium capitalize">{p.type}</p>
                  <p className="text-xs text-slate-400">{p.receivedAt ? formatDate(p.receivedAt) : formatDate(p.createdAt)}</p>
                </div>
                <p className="text-sm font-medium text-emerald-600">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No payments recorded.</p>
        )}
      </div>

      <div className="card p-6 md:col-span-2 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Identifiers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'PRO Number', value: claim.proNumber },
            { label: 'BOL Number', value: claim.identifiers?.find((i: any) => i.type === 'bol')?.value },
            { label: 'PO Number', value: claim.identifiers?.find((i: any) => i.type === 'po')?.value },
            { label: 'Reference', value: claim.identifiers?.find((i: any) => i.type === 'ref')?.value },
          ].map(item => (
            <div key={item.label} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{item.value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Parent Claim */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary-500" />
          Parent Claim
        </h3>
        {(claim as any).parentClaimId ? (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Link
              href={`/claims/${(claim as any).parentClaimId}`}
              className="text-sm font-medium text-primary-500 hover:text-primary-600 hover:underline"
            >
              View Parent Claim &rarr;
            </Link>
            <button
              onClick={() => { if (confirm('Unlink parent claim?')) removeParentMutation.mutate(); }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Unlink
            </button>
          </div>
        ) : showParentSearch ? (
          <div className="space-y-2">
            <input
              type="text"
              value={parentSearchTerm}
              onChange={(e) => setParentSearchTerm(e.target.value)}
              placeholder="Search by claim number or PRO..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              autoFocus
            />
            {parentSearchResults.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {parentSearchResults.filter((c: any) => c.id !== claimId).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setParentMutation.mutate(c.id)}
                    className="w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors text-sm"
                  >
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{c.claimNumber}</span>
                    {c.customerName && <span className="text-slate-400 ml-2">{c.customerName}</span>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setShowParentSearch(false); setParentSearchTerm(''); }} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setShowParentSearch(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            <Plus className="w-4 h-4" /> Set Parent Claim
          </button>
        )}
      </div>

      {/* Child Claims */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-primary-500 rotate-90" />
            Child Claims
            {childClaims.length > 0 && (
              <span className="text-xs font-normal text-slate-400">({childClaims.length})</span>
            )}
          </h3>
          <button
            onClick={() => setShowLinkChild(!showLinkChild)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600"
          >
            <Plus className="w-3.5 h-3.5" /> Link Child
          </button>
        </div>

        {showLinkChild && (
          <div className="space-y-2">
            <input
              type="text"
              value={childSearchTerm}
              onChange={(e) => setChildSearchTerm(e.target.value)}
              placeholder="Search by claim number or PRO..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              autoFocus
            />
            {childSearchResults.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {childSearchResults.filter((c: any) => c.id !== claimId).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => linkChildMutation.mutate(c.id)}
                    className="w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors text-sm"
                  >
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{c.claimNumber}</span>
                    {c.customerName && <span className="text-slate-400 ml-2">{c.customerName}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {childClaims.length > 0 ? (
          <div className="space-y-2">
            {childClaims.map((child: any) => (
              <Link
                key={child.id}
                href={`/claims/${child.id}`}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{child.claimNumber}</p>
                  <p className="text-xs text-slate-400">{child.status} &middot; {formatCurrency(child.claimAmount)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No child claims linked.</p>
        )}
      </div>
    </div>
  );
}

function CommentsActivityTab({ comments: initialComments, timeline, claimId }: { comments: ClaimComment[]; timeline: Claim['timeline']; claimId: string }) {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [viewMode, setViewMode] = useState<'comments' | 'activity'>('comments');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: comments = initialComments } = useQuery({
    queryKey: ['claim-comments', claimId],
    queryFn: () => getList<any>(`/claims/${claimId}/comments`),
    initialData: initialComments,
    refetchInterval: 30000,
  });

  const { data: teamUsers = [] } = useQuery({
    queryKey: ['team-users-mention'],
    queryFn: () => getList<any>('/users?limit=100'),
    staleTime: 60000,
  });

  const filteredMentionUsers = mentionQuery
    ? teamUsers.filter((u: any) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(mentionQuery.toLowerCase()) || u.email.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setNewComment(val);
    const cursor = e.target.selectionStart || 0;
    const before = val.substring(0, cursor);
    const atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  }

  function insertMention(user: any) {
    const cursor = commentRef.current?.selectionStart || 0;
    const before = newComment.substring(0, cursor).replace(/@\w*$/, '');
    const after = newComment.substring(cursor);
    const mention = `@${user.firstName} ${user.lastName} `;
    setNewComment(before + mention + after);
    setMentionedIds(prev => [...prev, user.id]);
    setShowMentions(false);
    setMentionQuery('');
    setTimeout(() => commentRef.current?.focus(), 50);
  }

  const addComment = useMutation({
    mutationFn: (data: any) => post(`/claims/${claimId}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-comments', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      setNewComment(''); setReplyTo(null); setIsInternal(false); setMentionedIds([]);
      toast.success('Comment added');
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      put(`/claims/${claimId}/comments/${commentId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-comments', claimId] });
      setEditingId(null); setEditContent('');
      toast.success('Comment updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => del(`/claims/${claimId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-comments', claimId] });
      toast.success('Comment deleted');
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ commentId, isPinned }: { commentId: string; isPinned: boolean }) =>
      post(`/claims/${claimId}/comments/${commentId}/pin`, { isPinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['claim-comments', claimId] }),
  });

  const topLevel = (comments as any[]).filter((c: any) => !c.parentId);
  const sorted = sortOrder === 'newest' ? topLevel : [...topLevel].reverse();
  const pinnedComments = sorted.filter((c: any) => c.isPinned);
  const unpinnedComments = sorted.filter((c: any) => !c.isPinned);
  const orderedComments = [...pinnedComments, ...unpinnedComments];

  function handleSubmit() {
    if (!newComment.trim()) return;
    addComment.mutate({
      content: newComment.trim(), type: 'comment',
      parentId: replyTo || undefined, isInternal: isInternal || undefined,
      mentionedUserIds: mentionedIds.length ? mentionedIds.join(',') : undefined,
    });
  }

  function applyFormat(format: 'bold' | 'italic' | 'underline') {
    const textarea = commentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = newComment.substring(start, end);
    if (!selected) {
      if (format === 'bold') setIsBold(!isBold);
      if (format === 'italic') setIsItalic(!isItalic);
      if (format === 'underline') setIsUnderline(!isUnderline);
      return;
    }
    const tags: Record<string, [string, string]> = { bold: ['**', '**'], italic: ['_', '_'], underline: ['__', '__'] };
    const [open, close] = tags[format];
    const replacement = `${open}${selected}${close}`;
    setNewComment(newComment.substring(0, start) + replacement + newComment.substring(end));
  }

  function renderComment(comment: any, depth = 0) {
    const authorName = comment.user ? `${comment.user.firstName} ${comment.user.lastName}` : 'User';
    const isEditing = editingId === comment.id;
    const replies = (comment.replies || []) as any[];

    return (
      <div key={comment.id} className={cn('card p-4', depth > 0 && 'ml-8 border-l-2 border-primary-200 dark:border-primary-800')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-300">
              {authorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-white">{authorName}</span>
              <span className="text-xs text-slate-400 ml-2">{relativeTime(comment.createdAt)}</span>
              {comment.editedAt && <span className="text-[10px] text-slate-400 ml-1">(edited)</span>}
            </div>
            {comment.isPinned && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">Pinned</span>}
            {comment.isInternal && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded">Internal</span>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => { setReplyTo(comment.id); setNewComment(''); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 text-xs" title="Reply">↩</button>
            <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500" title="Edit"><Edit2 className="w-3 h-3" /></button>
            <button onClick={() => pinMutation.mutate({ commentId: comment.id, isPinned: !comment.isPinned })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500" title={comment.isPinned ? 'Unpin' : 'Pin'}>
              {comment.isPinned ? '★' : '☆'}
            </button>
            <button onClick={() => { if (confirm('Delete comment?')) deleteMutation.mutate(comment.id); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <div className="flex gap-2">
              <button onClick={() => editMutation.mutate({ commentId: comment.id, content: editContent })} className="bg-primary-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Save</button>
              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
        )}
        {replies.length > 0 && (
          <div className="mt-3 space-y-2">
            {replies.map((r: any) => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setViewMode('comments')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', viewMode === 'comments' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'text-slate-500')}>
            Comments ({comments.length})
          </button>
          <button onClick={() => setViewMode('activity')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', viewMode === 'activity' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'text-slate-500')}>
            Activity Log ({timeline?.length || 0})
          </button>
        </div>
        {viewMode === 'comments' && (
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="text-xs text-slate-500 border rounded px-2 py-1 dark:bg-slate-700 dark:border-slate-600">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        )}
      </div>

      {viewMode === 'comments' ? (
        <>
          <div className="card p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Comments</h4>
            {replyTo && (
              <div className="flex items-center gap-2 text-xs text-primary-600 bg-primary-50 dark:bg-primary-950 px-3 py-1.5 rounded-lg">
                <span>Replying to comment</span>
                <button onClick={() => setReplyTo(null)} className="text-red-500 font-medium ml-auto">Cancel</button>
              </div>
            )}
            {/* Rich text toolbar */}
            <div className="flex items-center gap-0.5 border rounded-t-lg px-2 py-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 flex-wrap">
              <button type="button" onClick={() => applyFormat('bold')} className={cn('px-2 py-1 rounded text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700', isBold && 'bg-slate-200 dark:bg-slate-700')}>B</button>
              <button type="button" onClick={() => applyFormat('italic')} className={cn('px-2 py-1 rounded text-xs italic hover:bg-slate-200 dark:hover:bg-slate-700', isItalic && 'bg-slate-200 dark:bg-slate-700')}>I</button>
              <button type="button" onClick={() => applyFormat('underline')} className={cn('px-2 py-1 rounded text-xs underline hover:bg-slate-200 dark:hover:bg-slate-700', isUnderline && 'bg-slate-200 dark:bg-slate-700')}>U</button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
              <button type="button" onClick={() => { const t = commentRef.current; if (t) { const s = t.selectionStart; setNewComment(newComment.substring(0, s) + '• ' + newComment.substring(s)); } }} className="px-2 py-1 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-700">• List</button>
              <button type="button" onClick={() => { const t = commentRef.current; if (t) { const s = t.selectionStart; setNewComment(newComment.substring(0, s) + '1. ' + newComment.substring(s)); } }} className="px-2 py-1 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-700">1. List</button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
              <span className="text-[10px] text-slate-400">Type @ to mention and notify someone</span>
            </div>
            <div className="relative">
              <textarea ref={commentRef} value={newComment} onChange={handleCommentChange}
                placeholder={replyTo ? 'Write a reply...' : 'Type @ to mention and notify someone.'}
                rows={4} className="w-full px-3 py-2 border border-t-0 rounded-b-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              {showMentions && filteredMentionUsers.length > 0 && (
                <div className="absolute left-0 bottom-full mb-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {filteredMentionUsers.map((u: any) => (
                    <button key={u.id} onClick={() => insertMention(u)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-[9px] font-bold text-primary-700 dark:text-primary-300">
                        {(u.firstName?.[0] || '')}{(u.lastName?.[0] || '')}
                      </div>
                      <span>{u.firstName} {u.lastName}</span>
                      <span className="text-xs text-slate-400 ml-auto">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded border-slate-300" />
                Internal only
              </label>
              <button onClick={handleSubmit} disabled={!newComment.trim() || addComment.isPending}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {addComment.isPending ? 'Posting...' : replyTo ? 'Reply' : 'Post Comment'}
              </button>
            </div>
          </div>
          {orderedComments.length === 0 ? (
            <EmptyState message="No comments yet" />
          ) : (
            <div className="space-y-3">
              {orderedComments.map((c: any) => renderComment(c))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-0">
          {!timeline?.length ? (
            <EmptyState message="No activity recorded" />
          ) : (
            timeline.map((event, idx) => (
              <div key={event.id} className="flex gap-4 pb-6 relative">
                {idx < timeline.length - 1 && (
                  <div className="absolute left-[11px] top-6 w-0.5 h-full bg-slate-200 dark:bg-slate-700" />
                )}
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 border-2 border-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{(event.status || '').replace('_', ' ')}</p>
                  {event.description && <p className="text-sm text-slate-500 mt-0.5">{event.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(event.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ActivityEntry {
  id: string;
  type: string;
  action: string;
  entity: string;
  description: string;
  userName: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ACTIVITY_ICONS: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  status_change: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  create: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  update: { icon: Edit2, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/40' },
  email_sent: { icon: Send, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  email: { icon: Mail, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  document_upload: { icon: Upload, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  document: { icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  task: { icon: ListTodo, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  comment: { icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-700' },
  system_comment: { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  payment: { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  carrier_acknowledgment: { icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/40' },
  notification: { icon: Bell, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/40' },
};

function getActivityIcon(action: string) {
  return ACTIVITY_ICONS[action] || { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700' };
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(entries: ActivityEntry[]): { label: string; items: ActivityEntry[] }[] {
  const groups: Map<string, ActivityEntry[]> = new Map();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const entry of entries) {
    const d = new Date(entry.createdAt).toDateString();
    let label: string;
    if (d === today) label = 'Today';
    else if (d === yesterday) label = 'Yesterday';
    else label = new Date(entry.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(entry);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function ActivityTab({ claimId }: { claimId: string }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['claim-activity', claimId],
    queryFn: () => getList<ActivityEntry>(`/claims/${claimId}/activity`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return <EmptyState message="No activity recorded for this claim yet." />;
  }

  const grouped = groupByDate(activities);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Activity Feed ({activities.length})</h3>
      </div>
      {grouped.map((group) => (
        <div key={group.label}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.label}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-0">
            {group.items.map((entry, idx) => {
              const iconInfo = getActivityIcon(entry.action);
              const Icon = iconInfo.icon;
              return (
                <div key={entry.id} className="flex gap-4 pb-5 relative">
                  {idx < group.items.length - 1 && (
                    <div className="absolute left-[17px] top-9 w-0.5 h-[calc(100%-24px)] bg-slate-200 dark:bg-slate-700" />
                  )}
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', iconInfo.bg)}>
                    <Icon className={cn('w-4 h-4', iconInfo.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-slate-500">{entry.userName}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400" title={formatDateTime(entry.createdAt)}>{relativeTime(entry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartiesCard({ claim, claimId }: { claim: Claim; claimId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'carrier', name: '', email: '', phone: '', scacCode: '' });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => post(`/claims/${claimId}/parties`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim', claimId] }); setShowAdd(false); resetForm(); toast.success('Party added'); },
    onError: () => toast.error('Failed to add party'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => put(`/claims/${claimId}/parties/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim', claimId] }); setEditingId(null); toast.success('Party updated'); },
    onError: () => toast.error('Failed to update party'),
  });

  const deleteMutation = useMutation({
    mutationFn: (partyId: string) => del(`/claims/${claimId}/parties/${partyId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim', claimId] }); toast.success('Party deleted'); },
    onError: () => toast.error('Failed to delete party'),
  });

  function resetForm() { setForm({ type: 'carrier', name: '', email: '', phone: '', scacCode: '' }); }

  function startEdit(party: any) {
    setEditingId(party.id);
    setForm({ type: party.type || 'carrier', name: party.name || '', email: party.email || '', phone: party.phone || '', scacCode: party.scacCode || '' });
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Parties</h3>
        <button onClick={() => { setShowAdd(true); resetForm(); }} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium">
          <Plus className="w-3.5 h-3.5" /> Add Party
        </button>
      </div>
      {showAdd && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input text-xs">
              <option value="carrier">Carrier</option>
              <option value="claimant">Claimant</option>
              <option value="shipper">Shipper</option>
              <option value="consignee">Consignee</option>
              <option value="broker">Broker</option>
            </select>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-xs" placeholder="Name *" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input text-xs" placeholder="Email" />
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input text-xs" placeholder="Phone" />
            <input value={form.scacCode} onChange={e => setForm(f => ({ ...f, scacCode: e.target.value }))} className="input text-xs" placeholder="SCAC Code" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
            <button onClick={() => addMutation.mutate(form)} disabled={!form.name || addMutation.isPending} className="text-xs bg-primary-500 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
              {addMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
      {claim.parties && claim.parties.length > 0 ? (
        <div className="space-y-3">
          {claim.parties.map((party) => editingId === party.id ? (
            <div key={party.id} className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input text-xs">
                  <option value="carrier">Carrier</option>
                  <option value="claimant">Claimant</option>
                  <option value="shipper">Shipper</option>
                  <option value="consignee">Consignee</option>
                  <option value="broker">Broker</option>
                </select>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-xs" placeholder="Name *" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input text-xs" placeholder="Email" />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input text-xs" placeholder="Phone" />
                <input value={form.scacCode} onChange={e => setForm(f => ({ ...f, scacCode: e.target.value }))} className="input text-xs" placeholder="SCAC Code" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
                <button onClick={() => updateMutation.mutate({ id: party.id, data: form })} disabled={!form.name || updateMutation.isPending} className="text-xs bg-primary-500 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div key={party.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="badge badge-info capitalize text-xs">{party.type}</span>
                  {party.scacCode && <span className="badge badge-neutral font-mono text-xs">{party.scacCode}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(party)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => { if (confirm('Delete this party?')) deleteMutation.mutate(party.id); }} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <p className="font-medium text-sm text-slate-900 dark:text-white">{party.name}</p>
              {party.email && <p className="text-xs text-slate-500">{party.email}</p>}
              {party.phone && <p className="text-xs text-slate-500">{party.phone}</p>}
            </div>
          ))}
        </div>
      ) : !showAdd ? (
        <p className="text-sm text-slate-400">No parties. Click "Add Party" to get started.</p>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('font-medium text-slate-900 dark:text-white capitalize', mono && 'font-mono')}>{value}</dd>
    </div>
  );
}

function EmptyState({ message, action, onActionClick }: { message: string; action?: string; onActionClick?: () => void }) {
  return (
    <div className="card p-12 text-center">
      <p className="text-slate-400 text-sm">{message}</p>
      {action && (
        <button onClick={onActionClick} className="mt-3 text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 mx-auto">
          <Plus className="w-4 h-4" /> {action}
        </button>
      )}
    </div>
  );
}
