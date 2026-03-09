'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, apiClient, uploadFile, fetchDocumentBlob } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Upload, FileText, CheckCircle, AlertCircle, ChevronRight,
  Sparkles, Eye, RotateCcw, Check, X as XIcon, Search,
  ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, Link2, Plus,
  Image as ImageIcon, FileSpreadsheet, File,
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

function getFileIcon(mimeType?: string) {
  if (mimeType?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (mimeType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />;
  return <File className="w-5 h-5 text-primary-500 flex-shrink-0" />;
}

function getStatusIcon(status: string) {
  if (status === 'approved' || status === 'completed') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'review') return <Eye className="w-4 h-4 text-amber-500" />;
  if (status === 'processing') return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
  return <AlertCircle className="w-4 h-4 text-slate-400" />;
}

export default function AIEntryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null);
  const [search, setSearch] = useState('');
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      return post<any>('/documents/link', {
        documentIds,
        createClaim: true,
      });
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
      const docs = Array.isArray(uploaded) ? uploaded : [uploaded];
      for (const doc of docs) {
        if (doc?.id) {
          await apiClient.post(`/documents/${doc.id}/process`).catch(() => {});
        }
      }
      return docs;
    },
    onSuccess: () => {
      toast.success('Documents uploaded — AI is analyzing them now');
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Upload failed'),
  });

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

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  }, [selectedIds.size]);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['ai-documents'],
    queryFn: () => getList<ProcessedDocument>('/ai/documents'),
  });

  const filtered = documents.filter(d =>
    (d.documentName || d.fileName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.category || d.documentType || '').toLowerCase().includes(search.toLowerCase())
  );

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
                          {getFileIcon(doc.mimeType)}
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
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                        >
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
}: {
  document: ProcessedDocument;
  allDocuments: ProcessedDocument[];
  editingFields: Record<string, string>;
  setEditingFields: (f: Record<string, string>) => void;
  onBack: () => void;
  onApprove: () => void;
  isApproving: boolean;
  onSelectDoc: (d: ProcessedDocument) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobType, setBlobType] = useState<string>('');
  const blobUrlRef = useRef<string | null>(null);
  const currentDocIdx = allDocuments.findIndex(d => d.id === doc.id);

  useEffect(() => {
    let cancelled = false;
    const docId = doc.documentId || doc.id;
    if (docId) {
      setBlobUrl(null);
      setBlobType('');
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
        <span className="text-xs text-slate-400">{currentDocIdx + 1} / {allDocuments.length}</span>
      </div>

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
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
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
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-auto min-h-[400px]">
            {blobUrl ? (
              blobType.startsWith('image/') ? (
                <img
                  src={blobUrl}
                  alt={doc.documentName || 'Document'}
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              ) : (
                <iframe
                  src={`${blobUrl}#toolbar=0&zoom=${zoom}`}
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

        <div className="card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Extracted Data</h3>
            <div className="flex items-center gap-2">
              {hasEdits && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">Edited</span>}
              <span className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                doc.confidence >= 0.95 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : doc.confidence >= 0.85 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
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

          <div className="flex-1 overflow-y-auto">
            {fields.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No extracted fields</p>
                <p className="text-xs text-slate-400 mt-1">AI is still processing or could not extract data from this document.</p>
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
                          field.confidence >= 0.95 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : field.confidence >= 0.85 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
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

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-white dark:bg-slate-800">
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
              Cancel
            </button>
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
              Approve & Create Claim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
