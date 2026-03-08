'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { get, put, post, del, getList, apiClient, uploadFile } from '@/lib/api-client';
import { cn, getStatusBadgeClass } from '@/lib/utils';
import { formatCurrency, formatDate, formatDateTime, CLAIM_STATUSES, CARMACK_TIMELINES, daysBetween } from 'shared';
import type { Claim, ClaimComment, ClaimTask, ClaimPayment } from 'shared';
import {
  Edit2, Mail, MoreHorizontal, ChevronRight,
  Plus, AlertTriangle, CheckCircle, Clock, Send,
  FileDown, Trash2,
} from 'lucide-react';

type Tab = 'status' | 'transportation' | 'form-data' | 'documents' | 'tasks' | 'emails-automation' | 'transactions' | 'additional' | 'comments';

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

  async function handleExportPdf() {
    setMenuOpen(false);
    try {
      const res = await apiClient.get('/reports/export/pdf', { responseType: 'blob', params: { claimId: id } });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim-${claim?.claimNumber || id}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Claim exported as PDF');
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
    { key: 'emails-automation', label: 'Emails & Automations' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'additional', label: 'Additional Information' },
    { key: 'comments', label: 'Comments & Activity Log' },
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
                        <FileDown className="w-4 h-4" /> Export as PDF
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
        {activeTab === 'form-data' && <FormDataTab claim={claim} />}
        {activeTab === 'documents' && <DocumentsTab documents={claim.documents || []} claimId={id} />}
        {activeTab === 'tasks' && <TasksTab tasks={claim.tasks || []} claimId={id} />}
        {activeTab === 'emails-automation' && <EmailsAutomationTab claimId={id} />}
        {activeTab === 'transactions' && <TransactionsTab claim={claim} />}
        {activeTab === 'additional' && <AdditionalInfoTab claim={claim} />}
        {activeTab === 'comments' && <CommentsActivityTab comments={claim.comments || []} timeline={claim.timeline || []} claimId={id} />}
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
    mutationFn: (data: { acknowledgmentDate?: string; referenceNumber?: string }) => put(`/claims/${claimId}`, data),
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

  function handleSaveAck() {
    setSaving(true);
    updateMutation.mutate({
      acknowledgmentDate: ackDate ? `${ackDate}T00:00:00.000Z` : undefined,
    });
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
                    <button className="text-xs text-primary-500 hover:text-primary-600 font-medium">
                      Invoice Status
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
            onBlur={handleSaveAck}
            placeholder="Enter reference number..."
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
      </div>
      {(saving || updateMutation.isPending) && (
        <p className="text-xs text-slate-500">Saving...</p>
      )}
    </div>
  );
}

function TransportationTab({ claim }: { claim: Claim }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Shipment Details</h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="PRO Number" value={claim.proNumber || 'N/A'} mono />
          <DetailRow label="BOL Number" value={(claim as any).bolNumber || 'N/A'} mono />
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

function FormDataTab({ claim }: { claim: Claim }) {
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

      {/* Products */}
      {claim.products && claim.products.length > 0 && (
        <div className="card overflow-hidden md:col-span-2">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Products / Line Items</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Weight</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Damage Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {claim.products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.description}</td>
                  <td className="px-4 py-3">{p.quantity}</td>
                  <td className="px-4 py-3">{p.weight ? `${p.weight} lbs` : '-'}</td>
                  <td className="px-4 py-3">{p.value ? formatCurrency(p.value) : '-'}</td>
                  <td className="px-4 py-3 capitalize">{p.damageType || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
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
        <EmptyState message="No documents uploaded yet" action="Upload Document" />
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

  const addTaskMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; priority?: string; dueDate?: string }) =>
      post(`/claims/${claimId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      setShowTaskForm(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDueDate('');
      toast.success('Task added');
    },
    onError: () => toast.error('Failed to add task'),
  });

  function handleSubmitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    addTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
    });
  }

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };

  if (tasks.length === 0 && !showTaskForm) {
    return (
      <EmptyState
        message="No tasks assigned to this claim yet."
        action="Add Task"
        onActionClick={() => setShowTaskForm(true)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {showTaskForm && (
        <form onSubmit={handleSubmitTask} className="card p-4 space-y-3">
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">Add Task</h4>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
            <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description (optional)</label>
            <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Task description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
              <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Due Date (optional)</label>
              <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={addTaskMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{addTaskMutation.isPending ? 'Adding...' : 'Add Task'}</button>
            <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 border rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          </div>
        </form>
      )}
      {tasks.map((task) => (
        <div key={task.id} className="card p-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', priorityColors[task.priority] || priorityColors.medium)}>
                {task.priority}
              </span>
              <span className="text-xs text-slate-400 capitalize">{task.status?.replace('_', ' ')}</span>
            </div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white">{task.title}</h4>
            {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
            {task.dueDate && <p className="text-xs text-slate-400 mt-1">Due: {formatDate(task.dueDate)}</p>}
          </div>
        </div>
      ))}
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
                <p className="text-xs text-slate-500">{email.from} &middot; {email.date}</p>
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
                  <p className="text-xs text-slate-500 capitalize">{auto.type} &middot; {auto.status === 'completed' ? `Executed ${auto.executedAt}` : `Scheduled ${auto.scheduledFor}`}</p>
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

function TransactionsTab({ claim }: { claim: Claim }) {
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const payments = claim.payments || [];
  const totalReceived = payments.reduce((s: number, p: ClaimPayment) => s + (p.amount || 0), 0);
  const claimAmount = claim.claimAmount ?? 0;
  const remaining = claimAmount - totalReceived;

  const addPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; type: string; method?: string; reference?: string; receivedAt?: string }) =>
      post(`/claims/${claim.id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentMethod('');
      toast.success('Payment logged');
    },
    onError: () => toast.error('Failed to log payment'),
  });

  function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    addPaymentMutation.mutate({
      amount,
      type: 'settlement',
      method: paymentMethod || undefined,
      reference: paymentReference || undefined,
      receivedAt: paymentDate || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-xs text-slate-500">Filed Amount</p><p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(claimAmount)}</p></div>
        <div className="card p-4 text-center"><p className="text-xs text-slate-500">Total Received</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(totalReceived)}</p></div>
        <div className="card p-4 text-center"><p className="text-xs text-slate-500">Remaining</p><p className="text-lg font-bold text-amber-600">{formatCurrency(remaining)}</p></div>
        <div className="card p-4 text-center"><p className="text-xs text-slate-500">Collection %</p><p className="text-lg font-bold text-primary-600">{claimAmount > 0 ? ((totalReceived / claimAmount) * 100).toFixed(1) : '0'}%</p></div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Payment History</h3>
        <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Log Payment</button>
      </div>

      {showPaymentForm && (
        <form onSubmit={handleSubmitPayment} className="card p-4 space-y-3">
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">Log Payment</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
              <input type="number" step="0.01" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reference</label>
              <input type="text" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Check #, ACH ref..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">Select</option>
                <option value="check">Check</option>
                <option value="ach">ACH</option>
                <option value="wire">Wire</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={addPaymentMutation.isPending} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{addPaymentMutation.isPending ? 'Saving...' : 'Save Payment'}</button>
            <button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 py-2 border rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Method</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Reference</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">From</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {payments.map((p: ClaimPayment) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium capitalize">{p.type}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500 capitalize">{p.method || '-'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-slate-500">{p.reference || '-'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">—</td>
                <td className="px-4 py-3 font-medium text-emerald-600">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">{p.receivedAt ? formatDate(p.receivedAt) : formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payments.length === 0 && !showPaymentForm && (
        <div className="card p-12 text-center">
          <p className="text-sm text-slate-400">No payments recorded for this claim</p>
        </div>
      )}
    </div>
  );
}

function AdditionalInfoTab({ claim }: { claim: Claim }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Parties</h3>
        {claim.parties && claim.parties.length > 0 ? (
          <div className="space-y-3">
            {claim.parties.map((party) => (
              <div key={party.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-info capitalize text-xs">{party.type}</span>
                  {party.scacCode && <span className="badge badge-neutral font-mono text-xs">{party.scacCode}</span>}
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{party.name}</p>
                {party.email && <p className="text-xs text-slate-500">{party.email}</p>}
                {party.phone && <p className="text-xs text-slate-500">{party.phone}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No additional party information.</p>
        )}
      </div>

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
            { label: 'BOL Number', value: (claim as any).bolNumber },
            { label: 'PO Number', value: (claim as any).poNumber },
            { label: 'Reference', value: (claim as any).referenceNumber },
          ].map(item => (
            <div key={item.label} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{item.value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommentsActivityTab({ comments, timeline, claimId }: { comments: ClaimComment[]; timeline: Claim['timeline']; claimId: string }) {
  const [newComment, setNewComment] = useState('');
  const [viewMode, setViewMode] = useState<'comments' | 'activity'>('comments');
  const queryClient = useQueryClient();

  const addComment = useMutation({
    mutationFn: (content: string) => post(`/claims/${claimId}/comments`, { content, type: 'comment' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      setNewComment('');
      toast.success('Comment added');
    },
  });

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('comments')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', viewMode === 'comments' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'text-slate-500')}
        >
          Comments ({comments.length})
        </button>
        <button
          onClick={() => setViewMode('activity')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', viewMode === 'activity' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'text-slate-500')}
        >
          Activity Log ({timeline?.length || 0})
        </button>
      </div>

      {viewMode === 'comments' ? (
        <>
          <div className="card p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => addComment.mutate(newComment)}
                disabled={!newComment.trim() || addComment.isPending}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {addComment.isPending ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
          {comments.length === 0 ? (
            <EmptyState message="No comments yet" />
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('badge text-xs', comment.type === 'system' ? 'badge-neutral' : 'badge-info')}>
                      {comment.type}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
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
