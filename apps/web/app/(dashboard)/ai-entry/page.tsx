'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, del, uploadFile, fetchDocumentBlob } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import Link from 'next/link';
import {
  Upload, FileText, CheckCircle, AlertCircle, ChevronRight,
  Sparkles, Eye, RotateCcw, Check, X as XIcon, Search,
  ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, Link2, Plus,
  Image as ImageIcon, FileSpreadsheet, File, Trash2, Edit,
  GitMerge, Loader2, AlertTriangle, Layers,
} from 'lucide-react';

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  edited?: boolean;
}

interface ProcessedDocument {
  id: string;
  documentId?: string;
  fileName?: string;
  documentName?: string;
  documentType?: string;
  category?: string;
  confidence: number;
  pages?: number;
  extractedFields?: ExtractedField[];
  summary?: string;
  status?: string;
  previewUrl?: string;
  claimId?: string;
  claimNumber?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  createdAt?: string;
  mimeType?: string;
}

const TYPE_COLORS: Record<string, string> = {
  bill_of_lading: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  proof_of_delivery: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  delivery_receipt: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  product_invoice: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  commercial_invoice: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  claim_form: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  damage_photos: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  inspection_report: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  weight_certificate: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  packing_list: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  rate_confirmation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  notice_of_claim: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  carrier_response: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  insurance_certificate: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  freight_bill: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  purchase_order: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400',
  correspondence: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

function getTypeColor(type: string) {
  const key = type.toLowerCase().replace(/ /g, '_');
  return TYPE_COLORS[key] || TYPE_COLORS.other;
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 0.80) return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (confidence >= 0.50) return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
  return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
}

function getFileIcon(mimeType?: string) {
  if (mimeType?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (mimeType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />;
  return <File className="w-5 h-5 text-primary-500 flex-shrink-0" />;
}

function DocThumb({ docId, mimeType }: { docId: string; mimeType?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType?.includes('pdf');
  if (!isImage && !isPdf) return null;

  useEffect(() => {
    let revoke: string | null = null;
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const corpId = localStorage.getItem('fc-impersonate-corporate');
    if (corpId) headers['X-Corporate-Id'] = corpId;

    fetch(`/api/v1/documents/${docId}/thumbnail`, { headers })
      .then(res => { if (!res.ok) throw new Error('fail'); return res.blob(); })
      .then(blob => { revoke = URL.createObjectURL(blob); setSrc(revoke); })
      .catch(() => {});

    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [docId]);

  if (!src) return null;
  return <img src={src} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700" />;
}

function getStatusIcon(status: string) {
  if (status === 'approved' || status === 'completed') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'review') return <Eye className="w-4 h-4 text-amber-500" />;
  if (status === 'processing') return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
  return <AlertCircle className="w-4 h-4 text-slate-400" />;
}

function GroupDocumentsModal({
  documents,
  onClose,
  onGroup,
  isPending,
}: {
  documents: ProcessedDocument[];
  onClose: () => void;
  onGroup: (ids: string[]) => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPending) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 400);
    return () => clearInterval(interval);
  }, [isPending]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            <h2 className="font-bold text-slate-900 dark:text-white">Group Documents</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <XIcon className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-sm text-slate-500 mb-3">Select documents to group into a single claim batch.</p>
          {documents.map(doc => {
            const type = doc.category || doc.documentType || 'other';
            return (
              <label
                key={doc.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selected.has(doc.id)
                    ? 'border-primary-300 bg-primary-50/50 dark:border-primary-600 dark:bg-primary-500/5'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={selected.has(doc.id)}
                  onChange={() => toggle(doc.id)}
                />
                <DocThumb docId={doc.documentId || doc.id} mimeType={doc.mimeType} />
                {!doc.mimeType?.startsWith('image/') && !doc.mimeType?.includes('pdf') && getFileIcon(doc.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {doc.documentName || doc.fileName || 'Document'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', getTypeColor(type))}>
                      {formatType(type)}
                    </span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', getConfidenceColor(doc.confidence))}>
                      {Math.round(doc.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {isPending && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">{Math.round(progress)}%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Grouping documents and matching to claim...</p>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-500">{selected.size} document{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400">
              Cancel
            </button>
            <button
              onClick={() => onGroup(Array.from(selected))}
              disabled={selected.size < 2 || isPending}
              className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              {isPending ? 'Grouping...' : 'Group & Create Claim'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIEntryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null);
  const [search, setSearch] = useState('');
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);

  const createClaimMutation = useMutation({
    mutationFn: async (doc: ProcessedDocument) => {
      const fields = (doc.extractedFields ?? []).reduce((acc: Record<string, string>, f) => {
        const editKey = `${doc.id}-${f.key}`;
        acc[f.key] = editingFields[editKey] ?? f.value;
        return acc;
      }, {});
      return post<any>('/ai/agents/intake', {
        type: 'document',
        documentText: `Document: ${doc.documentName || doc.fileName || 'unknown'}\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
        documentId: doc.documentId || doc.id,
        autoCreate: true,
      });
    },
    onSuccess: (data) => {
      const claimId = data?.structuredOutput?.createdClaim?.claimId;
      if (claimId) {
        toast.success(`Claim created: ${data.structuredOutput.createdClaim.claimNumber}`);
        router.push(`/claims/${claimId}`);
      } else {
        toast.success('AI processed the document. Review the results to create a claim manually.');
        setSelectedDoc(null);
      }
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Failed to create claim from document'),
  });

  const groupClaimMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      const documentIds = docIds.map(id => {
        const d = (documents as ProcessedDocument[]).find(dd => dd.id === id);
        return d?.documentId || id;
      });
      return post<any>('/ai/documents/match-claim', { documentIds });
    },
    onSuccess: (data) => {
      const claimId = data?.data?.claimId || data?.claimId;
      if (claimId) {
        toast.success('Documents grouped and claim created');
        router.push(`/claims/${claimId}`);
      } else {
        toast.success('Documents grouped successfully');
      }
      setSelectedIds(new Set());
      setShowGroupModal(false);
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Failed to group documents'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const uploadRes = await uploadFile('/documents/upload', formData);
      const uploaded = uploadRes?.data?.uploaded || (Array.isArray(uploadRes) ? uploadRes : [uploadRes]);
      return Array.isArray(uploaded) ? uploaded : [uploaded];
    },
    onSuccess: () => {
      toast.success('Documents uploaded — AI is analyzing them now');
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Upload failed'),
  });

  const retryMutation = useMutation({
    mutationFn: async (doc: ProcessedDocument) => {
      const docId = doc.documentId || doc.id;
      return post<any>(`/documents/${docId}/process`);
    },
    onSuccess: () => {
      toast.success('Retrying AI extraction...');
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Failed to retry extraction'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => del(`/ai/documents/${docId}`),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => del(`/ai/documents/${id}`)));
    },
    onSuccess: (_data, ids) => {
      toast.success(`${ids.length} document(s) deleted`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Failed to delete some documents'),
  });

  function handleDelete(id: string) {
    if (!confirm('Delete this document? This will also remove the file from storage.')) return;
    deleteMutation.mutate(id);
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} document(s)? This will also remove files from storage.`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  }

  function handleUploadClick() { fileInputRef.current?.click(); }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadMutation.mutate(files);
      e.target.value = '';
    }
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['ai-documents'],
    queryFn: () => getList<ProcessedDocument>('/ai/documents'),
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (Array.isArray(docs) && docs.some(d => d.status === 'processing')) return 3000;
      return false;
    },
  });

  const filtered = documents.filter(d =>
    (d.documentName || d.fileName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.category || d.documentType || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  }, [selectedIds.size, filtered]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton count={2} />
        <TableSkeleton />
      </div>
    );
  }

  if (selectedDoc) {
    return (
      <ReviewDataCapture
        document={selectedDoc}
        allDocuments={documents}
        editingFields={editingFields}
        setEditingFields={setEditingFields}
        onBack={() => setSelectedDoc(null)}
        onApprove={() => { if (selectedDoc) createClaimMutation.mutate(selectedDoc); }}
        isApproving={createClaimMutation.isPending}
        onSelectDoc={setSelectedDoc}
        onRetry={() => { if (selectedDoc) retryMutation.mutate(selectedDoc); }}
        isRetrying={retryMutation.isPending}
      />
    );
  }

  const categorizationAccuracy = documents.length > 0
    ? Math.round(documents.reduce((acc, d) => acc + d.confidence, 0) / documents.length * 100)
    : 0;

  const allFields = documents.flatMap(d => d.extractedFields ?? []);
  const dataCaptureAccuracy = allFields.length > 0
    ? Math.round(allFields.reduce((acc, f) => acc + (f.confidence ?? 0), 0) / allFields.length * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-500" /> AI Entry
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload documents and let AI extract, classify, and organize your freight claim data.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size >= 2 && (
            <button
              onClick={() => groupClaimMutation.mutate(Array.from(selectedIds))}
              disabled={groupClaimMutation.isPending}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              {groupClaimMutation.isPending ? 'Grouping...' : `Group ${selectedIds.size} Docs → Claim`}
            </button>
          )}
          {documents.length >= 2 && (
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Layers className="w-4 h-4" /> Group Documents
            </button>
          )}
          <button
            onClick={handleUploadClick}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {uploadMutation.isPending ? 'Uploading...' : 'Upload Documents'}
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt" className="hidden" onChange={handleFileChange} />
      </div>

      {documents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Categorization Accuracy</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${categorizationAccuracy}%` }} />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{categorizationAccuracy}%</span>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Data Capture Accuracy</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${dataCaptureAccuracy}%` }} />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{dataCaptureAccuracy}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents by name, type, or content..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI-processed documents"
          description="Upload freight documents (PDFs, images, spreadsheets) and AI will classify and extract data automatically."
        />
      ) : (
        <div className="card overflow-hidden">
          {selectedIds.size > 0 && (
            <div className="px-4 py-2.5 bg-primary-50 dark:bg-primary-500/10 border-b border-primary-100 dark:border-primary-500/20 flex items-center justify-between">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} selected</span>
              <div className="flex gap-2">
                <button onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-primary-500 hover:text-primary-600">Clear</button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Summary</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filtered.map((doc) => {
                  const type = doc.category || doc.documentType || 'other';
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={cn(
                        'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer',
                        selectedIds.has(doc.id) && 'bg-primary-50/50 dark:bg-primary-500/5'
                      )}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-slate-300" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <DocThumb docId={doc.documentId || doc.id} mimeType={doc.mimeType} />
                          {!doc.mimeType?.startsWith('image/') && !doc.mimeType?.includes('pdf') && getFileIcon(doc.mimeType)}
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px] lg:max-w-xs">{doc.documentName || doc.fileName || 'Document'}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{doc.mimeType?.split('/').pop() || 'file'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap', getTypeColor(type))}>
                          {formatType(type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-slate-500 line-clamp-2 max-w-[300px]">{doc.summary || '—'}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(doc.status || 'completed')}
                          <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{doc.status || 'completed'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                          >
                            Review <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {showGroupModal && (
        <GroupDocumentsModal
          documents={documents}
          onClose={() => setShowGroupModal(false)}
          onGroup={(ids) => groupClaimMutation.mutate(ids)}
          isPending={groupClaimMutation.isPending}
        />
      )}
    </div>
  );
}

function ReviewDataCapture({
  document: doc,
  allDocuments,
  editingFields,
  setEditingFields,
  onBack,
  onApprove,
  isApproving,
  onSelectDoc,
  onRetry,
  isRetrying,
}: {
  document: ProcessedDocument;
  allDocuments: ProcessedDocument[];
  editingFields: Record<string, string>;
  setEditingFields: (f: Record<string, string>) => void;
  onBack: () => void;
  onApprove: () => void;
  isApproving: boolean;
  onSelectDoc: (d: ProcessedDocument) => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  const router = useRouter();
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobType, setBlobType] = useState<string>('');
  const blobUrlRef = useRef<string | null>(null);
  const currentDocIdx = allDocuments.findIndex(d => d.id === doc.id);
  const [matchResults, setMatchResults] = useState<any[] | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [conflictOverrides, setConflictOverrides] = useState<Record<string, string>>({});

  const conflicts = useMemo(() => {
    if (allDocuments.length < 2) return [];
    const fieldMap = new Map<string, { docId: string; docName: string; value: string; label: string }[]>();
    for (const d of allDocuments) {
      for (const f of (d.extractedFields ?? [])) {
        const existing = fieldMap.get(f.key) || [];
        existing.push({
          docId: d.id,
          docName: d.documentName || d.fileName || 'Unknown',
          value: f.value,
          label: f.label,
        });
        fieldMap.set(f.key, existing);
      }
    }
    const result: Array<{
      key: string;
      label: string;
      entries: Array<{ docId: string; docName: string; value: string }>;
    }> = [];
    for (const [key, entries] of fieldMap) {
      const uniqueValues = new Set(entries.map(e => e.value.trim().toLowerCase()));
      if (uniqueValues.size > 1 && entries.length > 1) {
        result.push({ key, label: entries[0].label, entries });
      }
    }
    return result;
  }, [allDocuments]);

  function handleConflictChoice(fieldKey: string, value: string) {
    setConflictOverrides(prev => ({ ...prev, [fieldKey]: value }));
    setEditingFields({ ...editingFields, [`${doc.id}-${fieldKey}`]: value });
  }

  async function handleMatchToClaim() {
    setMatchLoading(true);
    try {
      const res = await post<any>('/ai/documents/match-claim', { documentId: doc.documentId || doc.id });
      const matches = res?.matches || [];
      setMatchResults(matches);
      if (matches.length === 0) {
        toast.info('No matching claims found. The document may belong to a new claim.');
      } else {
        toast.success(`Found ${matches.length} potential matching claim${matches.length > 1 ? 's' : ''}`);
      }
    } catch {
      toast.error('Failed to search for matching claims');
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleAttachToClaim(claimId: string) {
    try {
      const docId = doc.documentId || doc.id;
      await post('/documents/link', { claimId, documentIds: [docId] });
      toast.success('Document attached to claim');
      router.push(`/claims/${claimId}`);
    } catch {
      toast.error('Failed to attach document to claim');
    }
  }

  useEffect(() => {
    let cancelled = false;
    const docId = doc.documentId || doc.id;
    if (docId) {
      setBlobUrl(null);
      setBlobType('');
      setCurrentPage(1);
      fetchDocumentBlob(docId).then(({ blobUrl: url, contentType }) => {
        if (!cancelled) {
          setBlobUrl(url);
          setBlobType(contentType);
          blobUrlRef.current = url;
        }
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [doc.documentId, doc.id]);

  const goToPrev = () => {
    if (currentDocIdx > 0) onSelectDoc(allDocuments[currentDocIdx - 1]);
  };
  const goToNext = () => {
    if (currentDocIdx < allDocuments.length - 1) onSelectDoc(allDocuments[currentDocIdx + 1]);
  };

  const fields = doc.extractedFields ?? [];
  const hasEdits = fields.some(f => {
    const editKey = `${doc.id}-${f.key}`;
    return editingFields[editKey] !== undefined && editingFields[editKey] !== f.value;
  });

  const pageCount = doc.pages || 1;
  const isMultiPage = pageCount > 1;
  const isImage = blobType.startsWith('image/');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Review Data Capture</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI analyzed the document content to determine its type and extract key fields. Edit any incorrect values below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToPrev} disabled={currentDocIdx <= 0} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs text-slate-400 font-medium">{currentDocIdx + 1} / {allDocuments.length}</span>
          <button onClick={goToNext} disabled={currentDocIdx >= allDocuments.length - 1} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Document tab bar */}
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {allDocuments.map((d, idx) => {
          const type = d.category || d.documentType || 'other';
          const isActive = d.id === doc.id;
          return (
            <button
              key={d.id}
              onClick={() => onSelectDoc(d)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap',
                isActive
                  ? 'bg-white dark:bg-slate-800 border-primary-300 dark:border-primary-600 shadow-sm ring-1 ring-primary-200 dark:ring-primary-500/20'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
            >
              {getFileIcon(d.mimeType)}
              <span className="truncate max-w-[120px]">{d.documentName || d.fileName || `Doc ${idx + 1}`}</span>
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', getTypeColor(type))}>
                {formatType(type)}
              </span>
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', getConfidenceColor(d.confidence))}>
                {Math.round(d.confidence * 100)}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
        {/* Document preview with page thumbnails */}
        <div className="card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
              {doc.documentName || doc.fileName || 'Document Preview'}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs text-slate-400 w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><ZoomIn className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1" />
              <button onClick={goToPrev} disabled={currentDocIdx <= 0} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={goToNext} disabled={currentDocIdx >= allDocuments.length - 1} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex flex-1 min-h-0">
            {/* Page thumbnails sidebar */}
            {isMultiPage && !isImage && (
              <div className="w-16 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 overflow-y-auto p-2 space-y-2">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      'w-full aspect-[3/4] rounded border-2 flex items-center justify-center text-xs font-bold transition-all',
                      currentPage === i + 1
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-primary-300 hover:text-primary-500'
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
            {/* Preview area */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-auto min-h-[400px]">
              {blobUrl ? (
                isImage ? (
                  <img
                    src={blobUrl}
                    alt={doc.documentName || 'Document'}
                    className="max-w-full max-h-full object-contain transition-transform"
                    style={{ transform: `scale(${zoom / 100})` }}
                  />
                ) : (
                  <iframe
                    src={`${blobUrl}#toolbar=0&zoom=${zoom}&page=${currentPage}`}
                    className="w-full h-full border-0 min-h-[500px]"
                    title={doc.documentName || 'Document'}
                  />
                )
              ) : (
                <div className="text-center p-8">
                  <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-medium">Loading document preview...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extracted data panel */}
        <div className="card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Extracted Data</h3>
            <div className="flex items-center gap-2">
              {hasEdits && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">Edited</span>}
              <span className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                getConfidenceColor(doc.confidence)
              )}>
                {Math.round(doc.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          {doc.summary && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{doc.summary}</p>
            </div>
          )}

          {/* Conflict detection banner */}
          {conflicts.length > 0 && (
            <div className="px-4 py-3 bg-amber-50/80 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  {conflicts.length} Field Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                </span>
              </div>
              <div className="space-y-3">
                {conflicts.map(conflict => (
                  <div key={conflict.key} className="bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-500/20 p-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">{conflict.label}</p>
                    <div className="space-y-1.5">
                      {conflict.entries.map((entry, i) => (
                        <label key={`${entry.docId}-${i}`} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name={`conflict-${conflict.key}`}
                            checked={(conflictOverrides[conflict.key] ?? '') === entry.value}
                            onChange={() => handleConflictChoice(conflict.key, entry.value)}
                            className="text-primary-500"
                          />
                          <span className="text-sm text-slate-900 dark:text-white font-medium group-hover:text-primary-600">{entry.value}</span>
                          <span className="text-[10px] text-slate-400 truncate">from {entry.docName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {fields.length === 0 ? (
              <div className="p-8 text-center">
                {doc.status === 'processing' ? (
                  <>
                    <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">AI is analyzing this document...</p>
                    <p className="text-xs text-slate-400 mt-1">This usually takes 10-30 seconds. The page will update automatically.</p>
                  </>
                ) : doc.status === 'failed' ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-red-500 font-medium">Extraction failed</p>
                    <p className="text-xs text-slate-400 mt-1">AI could not extract data from this document. Try re-uploading or check the document format.</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="mt-3 inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        {isRetrying ? 'Retrying...' : 'Retry Extraction'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No extracted fields</p>
                    <p className="text-xs text-slate-400 mt-1">No data was found in this document.</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="mt-3 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Re-analyze
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {fields.map((field) => {
                  const editKey = `${doc.id}-${field.key}`;
                  const isEdited = editingFields[editKey] !== undefined && editingFields[editKey] !== field.value;
                  return (
                    <div key={field.key} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{field.label}</label>
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          getConfidenceColor(field.confidence)
                        )}>
                          {Math.round(field.confidence * 100)}%
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editingFields[editKey] ?? field.value}
                        onChange={(e) => setEditingFields({ ...editingFields, [editKey]: e.target.value })}
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
                          isEdited
                            ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/30'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800'
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {matchResults && matchResults.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-500/5">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5" /> Matching Claims Found
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {matchResults.map((m: any) => (
                  <button
                    key={m.claimId}
                    onClick={() => handleAttachToClaim(m.claimId)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-500 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white">{m.claimNumber}</span>
                      {m.proNumber && <span className="text-slate-400">PRO: {m.proNumber}</span>}
                      {m.carrierName && <span className="text-slate-400 truncate">{m.carrierName}</span>}
                    </div>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase',
                      m.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    )}>{m.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleMatchToClaim}
                disabled={matchLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {matchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                Attach to Claim
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/claims/new?aiDocId=${doc.id}`}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border border-primary-300 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Fill Form & Edit
              </Link>
              <button
                onClick={onApprove}
                disabled={isApproving}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isApproving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Quick Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
