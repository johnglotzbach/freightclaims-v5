'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, getList, del, post, uploadFile, fetchDocumentBlob } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import { PdfViewer } from '@/components/pdf-viewer';
import {
  FileText, Search, Upload, Download, Eye, Trash2,
  FolderOpen, Image, Brain, List, Grid,
  CheckCircle, TrendingUp, Loader2, Link2, FilePlus2,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, RefreshCw,
} from 'lucide-react';

const CATEGORIES = [
  'All', 'Bill of Lading', 'Freight Invoice', 'Product Invoice',
  'Delivery Receipt or Proof of Delivery', 'Inspection Report',
  'Freight Damage Photo', 'Concealed Damage', 'Reefer Log',
  'Internal Pictures', 'Insurance Certificate', 'Carrier Communication', 'Other',
];

interface Document {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  claimId?: string;
  claimNumber: string;
  uploadedBy: string;
  date: string;
  size: string;
  type: 'pdf' | 'image';
  mimeType?: string;
  aiProcessed: boolean;
  aiProcessingStatus?: string;
  confidence?: number | null;
  thumbnailKey?: string | null;
}

interface ClaimOption {
  id: string;
  claimNumber: string;
}

function getTypeColor(category: string) {
  const colors: Record<string, string> = {
    'Bill of Lading': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    'Freight Invoice': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    'Product Invoice': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    'Delivery Receipt or Proof of Delivery': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    'Inspection Report': 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
    'Freight Damage Photo': 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    'Concealed Damage': 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    'Reefer Log': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
    'Internal Pictures': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    'Insurance Certificate': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    'Carrier Communication': 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    'Other': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return colors[category] || colors['Other'];
}

function getStatusPill(status?: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
    case 'processing':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
    default:
      return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'processing': return 'Processing';
    case 'failed': return 'Failed';
    default: return 'Pending';
  }
}

function getFileBadge(mimeType?: string): { label: string; className: string } | null {
  if (!mimeType) return null;
  if (mimeType === 'application/pdf') return { label: 'PDF', className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 font-bold' };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('ms-excel')) return { label: 'XLSX', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-bold' };
  if (mimeType.includes('word') || mimeType.includes('document')) return { label: 'DOCX', className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 font-bold' };
  if (mimeType === 'text/csv') return { label: 'CSV', className: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 font-bold' };
  if (mimeType.startsWith('image/')) return null;
  return null;
}

function DocumentThumbnail({ doc, size = 'lg' }: { doc: Document; size?: 'sm' | 'lg' }) {
  const badge = getFileBadge(doc.mimeType);
  const isImage = doc.mimeType?.startsWith('image/');
  const dim = size === 'lg' ? 'w-full aspect-square' : 'w-10 h-10';
  const badgeText = size === 'lg' ? 'text-2xl' : 'text-[9px]';
  const iconSize = size === 'lg' ? 'w-10 h-10' : 'w-5 h-5';

  if (isImage && doc.thumbnailKey) {
    return (
      <div className={cn(dim, 'bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden')}>
        <img
          src={`/api/v1/documents/${doc.id}/thumbnail`}
          alt={doc.name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="flex items-center justify-center w-full h-full"><svg class="${iconSize} text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`; }}
        />
      </div>
    );
  }

  if (badge) {
    return (
      <div className={cn(dim, 'bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center')}>
        <span className={cn('px-2.5 py-1 rounded-lg', badgeText, badge.className)}>{badge.label}</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={cn(dim, 'bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center')}>
        <Image className={cn(iconSize, 'text-violet-400')} />
      </div>
    );
  }

  return (
    <div className={cn(dim, 'bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center')}>
      <FileText className={cn(iconSize, 'text-primary-400')} />
    </div>
  );
}

function extractClaims(raw: unknown): ClaimOption[] {
  const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) ? (raw as any).data : [];
  return arr.map((c: any) => ({ id: c.id, claimNumber: c.claimNumber || c.id }));
}

type SortKey = 'name' | 'date' | 'category' | 'aiProcessingStatus';
type SortDir = 'asc' | 'desc';

export default function DocumentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<string[]>([]);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string; type?: string } | null>(null);
  const [uploadClaimId, setUploadClaimId] = useState<string>('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [linkClaimId, setLinkClaimId] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getList<Document>('/documents'),
  });

  const { data: rawClaims } = useQuery({
    queryKey: ['claims-for-linking'],
    queryFn: () => get<unknown>('/claims?limit=200'),
    enabled: showUploadPanel || showLinkModal,
  });
  const claimOptions = extractClaims(rawClaims);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      if (uploadClaimId) {
        formData.append('claimId', uploadClaimId);
      }
      return await uploadFile('/documents/upload', formData);
    },
    onSuccess: (data) => {
      const uploaded = data?.data?.uploaded || data?.uploaded || (Array.isArray(data) ? data : [data]);
      toast.success(`${uploaded.length} document(s) uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUploadPanel(false);
      setUploadClaimId('');

      for (const doc of uploaded) {
        if (doc?.id) {
          processMutation.mutate(doc.id);
        }
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Upload failed. Please try again.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/documents/${id}`),
    onSuccess: (_data, id) => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelected((prev) => prev.filter((s) => s !== id));
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => del(`/documents/${id}`)));
    },
    onSuccess: (_data, ids) => {
      toast.success(`${ids.length} document(s) deleted`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelected([]);
    },
    onError: () => toast.error('Failed to delete some documents'),
  });

  const linkMutation = useMutation({
    mutationFn: async ({ claimId, documentIds }: { claimId: string; documentIds: string[] }) => {
      return post('/documents/link', { claimId, documentIds });
    },
    onSuccess: () => {
      toast.success('Documents linked to claim');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelected([]);
      setShowLinkModal(false);
      setLinkClaimId('');
    },
    onError: () => toast.error('Failed to link documents'),
  });

  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const processMutation = useMutation({
    mutationFn: (id: string) => post(`/documents/${id}/process`),
    onMutate: (id) => setProcessingDocId(id),
    onSuccess: () => {
      toast.success('AI analysis started - document is being processed');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => toast.error('Failed to start AI analysis'),
    onSettled: () => setProcessingDocId(null),
  });

  const bulkReanalyzeMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.allSettled(ids.map(id => post(`/documents/${id}/process`)));
    },
    onSuccess: () => {
      toast.success('AI re-analysis started for selected documents');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelected([]);
    },
    onError: () => toast.error('Failed to start re-analysis'),
  });

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    deleteMutation.mutate(id);
  }

  function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} document(s)?`)) return;
    bulkDeleteMutation.mutate([...selected]);
  }

  async function handleBulkDownload() {
    for (const id of selected) {
      const doc = docs.find(d => d.id === id);
      if (doc) {
        try {
          const { blobUrl } = await fetchDocumentBlob(doc.id);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = doc.name || 'document';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch { /* skip failed downloads */ }
      }
    }
    toast.success(`Downloading ${selected.length} document(s)`);
  }

  function handleUploadClick() {
    setShowUploadPanel(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadMutation.mutate(files);
      e.target.value = '';
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  }

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map(d => d.id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton count={2} />
        <TableSkeleton />
      </div>
    );
  }

  const aiProcessedDocs = docs.filter(d => d.aiProcessed);
  const categorizationAccuracy = aiProcessedDocs.length > 0
    ? Math.round(aiProcessedDocs.reduce((acc, d) => acc + (d.confidence || 0), 0) / aiProcessedDocs.length * 100)
    : 0;

  const filtered = docs.filter((d) => {
    const matchSearch = (d.name || '').toLowerCase().includes(search.toLowerCase()) || (d.claimNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || d.category === category;
    return matchSearch && matchCat;
  });

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'date':
          cmp = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
          break;
        case 'category':
          cmp = (a.category || '').localeCompare(b.category || '');
          break;
        case 'aiProcessingStatus':
          cmp = (a.aiProcessingStatus || '').localeCompare(b.aiProcessingStatus || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  async function handleView(doc: Document) {
    try {
      const { blobUrl, contentType } = await fetchDocumentBlob(doc.id);
      setViewingDoc({ url: blobUrl, name: doc.name, type: contentType });
    } catch {
      toast.error('Failed to load document preview');
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const { blobUrl } = await fetchDocumentBlob(doc.id);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.name || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      toast.error('Failed to download document');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary-500" /> Documents
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} · {aiProcessedDocs.length} AI processed</p>
        </div>
        <button onClick={handleUploadClick} disabled={uploadMutation.isPending} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
          <Upload className="w-4 h-4" /> {uploadMutation.isPending ? 'Uploading...' : 'Upload Documents'}
        </button>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Upload Panel */}
      {showUploadPanel && (
        <div className="bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary-500" /> Upload Documents
            </h3>
            <button onClick={() => setShowUploadPanel(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Link to Claim (optional)
            </label>
            <select
              value={uploadClaimId}
              onChange={e => setUploadClaimId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">No claim (general upload)</option>
              {claimOptions.map(c => (
                <option key={c.id} value={c.id}>{c.claimNumber}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Select a claim to link these documents to, or upload as general documents.</p>
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-primary-400 dark:hover:border-primary-600 transition-colors cursor-pointer"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
              <span className="text-sm text-slate-500">
                {uploadMutation.isPending ? 'Uploading...' : 'Click to select files (PDF, images, docs)'}
              </span>
              <span className="text-xs text-slate-400">Multiple files supported · Max 50MB each</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Brain className="w-3 h-3 text-violet-500" />
            Gemini AI will automatically analyze and extract data from uploaded documents.
          </p>
        </div>
      )}

      {/* Link to Claim Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Link {selected.length} document(s) to Claim</h3>
            <select
              value={linkClaimId}
              onChange={e => setLinkClaimId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">Select a claim...</option>
              {claimOptions.map(c => (
                <option key={c.id} value={c.id}>{c.claimNumber}</option>
              ))}
            </select>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => { setShowLinkModal(false); setLinkClaimId(''); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                onClick={() => linkClaimId && linkMutation.mutate({ claimId: linkClaimId, documentIds: selected })}
                disabled={!linkClaimId || linkMutation.isPending}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {linkMutation.isPending ? 'Linking...' : 'Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {docs.length === 0 && !showUploadPanel ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents yet"
          description="Upload documents to get started with AI-powered extraction and categorization."
        />
      ) : docs.length > 0 && (
        <>
          {/* Accuracy Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">AI Categorization</h3>
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Gemini
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${categorizationAccuracy}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{categorizationAccuracy}%</span>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Documents Processed</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: docs.length > 0 ? `${Math.round(aiProcessedDocs.length / docs.length * 100)}%` : '0%' }}
                  />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{aiProcessedDocs.length}/{docs.length}</span>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const count = cat === 'All' ? docs.length : docs.filter((d) => d.category === cat).length;
              if (cat !== 'All' && count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs transition-all',
                    category === cat
                      ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search + Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by file name or claim number..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button onClick={() => setViewMode('list')} className={cn('p-2.5', viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:text-slate-600')}>
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('grid')} className={cn('p-2.5', viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:text-slate-600')}>
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Batch Actions Toolbar */}
          {selected.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap bg-primary-50 dark:bg-primary-500/5 border border-primary-200 dark:border-primary-500/20 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{selected.length} selected</span>
              <div className="w-px h-5 bg-primary-200 dark:bg-primary-500/30 mx-1" />
              <button
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-500/30"
              >
                <Link2 className="w-3.5 h-3.5" /> Link to Claim
              </button>
              <button
                onClick={() => { const ids = selected.join(','); router.push(`/claims/new?documentIds=${ids}`); }}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-500/30"
              >
                <FilePlus2 className="w-3.5 h-3.5" /> Create Claim
              </button>
              <button
                onClick={handleBulkDownload}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-700 dark:text-slate-400 font-medium px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" /> Download All
              </button>
              <button
                onClick={() => bulkReanalyzeMutation.mutate([...selected])}
                disabled={bulkReanalyzeMutation.isPending}
                className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-violet-200 dark:border-violet-500/30 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', bulkReanalyzeMutation.isPending && 'animate-spin')} /> Re-analyze with AI
              </button>
              <button onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-500/30 disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="w-8 px-4 py-3">
                        <input type="checkbox" className="rounded" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" onClick={() => handleSort('name')}>
                        <span className="flex items-center">File <SortIcon col="name" /></span>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell cursor-pointer select-none" onClick={() => handleSort('category')}>
                        <span className="flex items-center">Type <SortIcon col="category" /></span>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('aiProcessingStatus')}>
                        <span className="flex items-center">Status <SortIcon col="aiProcessingStatus" /></span>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Claim</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('date')}>
                        <span className="flex items-center">Date <SortIcon col="date" /></span>
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {sorted.map((doc) => {
                      const badge = getFileBadge(doc.mimeType);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors even:bg-slate-50/50 dark:even:bg-slate-900/50">
                          <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggleSelect(doc.id)} className="rounded" /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <DocumentThumbnail doc={doc} size="sm" />
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 dark:text-white truncate max-w-xs">{doc.name}</div>
                                <div className="text-xs text-slate-400">{doc.size}</div>
                              </div>
                              {doc.aiProcessed && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  <CheckCircle className="w-3 h-3" /> AI
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg', getTypeColor(doc.category))}>
                              {doc.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', getStatusPill(doc.aiProcessingStatus))}>
                              {getStatusLabel(doc.aiProcessingStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {doc.claimId && doc.claimNumber ? (
                              <button onClick={() => router.push(`/claims/${doc.claimId}`)} className="text-xs text-primary-500 hover:text-primary-600 font-medium hover:underline">
                                {doc.claimNumber}
                              </button>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">Unlinked</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                            {doc.date ? new Date(doc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleView(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Preview"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => handleDownload(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Download"><Download className="w-4 h-4" /></button>
                              <button onClick={() => processMutation.mutate(doc.id)} disabled={processingDocId !== null} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-violet-500 disabled:opacity-50" title="AI Analyze">{processingDocId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}</button>
                              <button onClick={() => handleDelete(doc.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 disabled:opacity-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">No documents match your search.</div>
              )}
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sorted.map((doc) => (
                <div key={doc.id} className={cn('card p-4 hover:shadow-lg transition-all group', selected.includes(doc.id) && 'ring-2 ring-primary-400')}>
                  <div className="relative mb-3">
                    <DocumentThumbnail doc={doc} size="lg" />
                    {doc.aiProcessed && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                        <CheckCircle className="w-3 h-3" />
                      </span>
                    )}
                    <input
                      type="checkbox"
                      checked={selected.includes(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      className="absolute top-2 left-2 rounded opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="font-medium text-xs text-slate-900 dark:text-white truncate">{doc.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{doc.size}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={cn('inline-block text-[10px] font-medium px-2 py-0.5 rounded-lg', getTypeColor(doc.category))}>
                      {doc.category}
                    </span>
                    <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full', getStatusPill(doc.aiProcessingStatus))}>
                      {getStatusLabel(doc.aiProcessingStatus)}
                    </span>
                  </div>
                  {doc.claimId && doc.claimNumber ? (
                    <button onClick={() => router.push(`/claims/${doc.claimId}`)} className="text-[10px] text-primary-500 mt-1 hover:underline">{doc.claimNumber}</button>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 inline-block">Unlinked</span>
                  )}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleView(doc)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDownload(doc)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={() => processMutation.mutate(doc.id)} disabled={processingDocId !== null} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-violet-500 disabled:opacity-50" title="AI Analyze">{processingDocId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => handleDelete(doc.id)} disabled={deleteMutation.isPending} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
