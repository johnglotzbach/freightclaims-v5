'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, getList, del, post } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import { PdfViewer } from '@/components/pdf-viewer';
import {
  FileText, Search, Upload, Download, Eye, Trash2,
  FolderOpen, Image, Brain, List, Grid,
  CheckCircle, TrendingUp, Loader2, Link2,
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
  claimId?: string;
  claimNumber: string;
  uploadedBy: string;
  date: string;
  size: string;
  type: 'pdf' | 'image';
  aiProcessed: boolean;
  confidence?: number | null;
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

function extractClaims(raw: unknown): ClaimOption[] {
  const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) ? (raw as any).data : [];
  return arr.map((c: any) => ({ id: c.id, claimNumber: c.claimNumber || c.id }));
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<string[]>([]);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string } | null>(null);
  const [uploadClaimId, setUploadClaimId] = useState<string>('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getList<Document>('/documents'),
  });

  const { data: rawClaims } = useQuery({
    queryKey: ['claims-for-upload'],
    queryFn: () => get<unknown>('/claims?limit=100'),
    enabled: showUploadPanel,
  });
  const claimOptions = extractClaims(rawClaims);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      if (uploadClaimId) {
        formData.append('claimId', uploadClaimId);
      }
      const res = await apiClient.post('/documents/upload', formData);
      return res.data;
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

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    deleteMutation.mutate(id);
  }

  function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} document(s)?`)) return;
    bulkDeleteMutation.mutate([...selected]);
  }

  function handleUploadClick() {
    setShowUploadPanel(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files);
      e.target.value = '';
    }
  }

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

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  async function handleView(doc: Document) {
    try {
      const result = await get<{ url: string }>(`/documents/${doc.id}/url`);
      const url = (result as any)?.url || (result as any)?.data?.url;
      if (url) {
        setViewingDoc({ url, name: doc.name });
      } else {
        toast.error('Could not get document URL');
      }
    } catch {
      toast.error('Failed to load document preview');
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const result = await get<{ url: string }>(`/documents/${doc.id}/url`);
      const url = (result as any)?.url || (result as any)?.data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Could not get download URL');
      }
    } catch {
      toast.error('Failed to get download URL');
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
          <p className="text-sm text-slate-500 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} &middot; {aiProcessedDocs.length} AI processed</p>
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
              <span className="text-xs text-slate-400">Multiple files supported &middot; Max 50MB each</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Brain className="w-3 h-3 text-violet-500" />
            Gemini AI will automatically analyze and extract data from uploaded documents.
          </p>
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
              {selected.length > 0 && (
                <button onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-2 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> Delete ({selected.length})
                </button>
              )}
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

          {/* List View */}
          {viewMode === 'list' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded" /></th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">File</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Claim</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {filtered.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggleSelect(doc.id)} className="rounded" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {doc.type === 'image' ? <Image className="w-5 h-5 text-violet-500 flex-shrink-0" /> : <FileText className="w-5 h-5 text-primary-500 flex-shrink-0" />}
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
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-primary-500 font-medium">{doc.claimNumber || '—'}</td>
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
                    ))}
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
              {filtered.map((doc) => (
                <div key={doc.id} className="card p-4 hover:shadow-lg transition-all group">
                  <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-3 relative">
                    {doc.type === 'image' ? <Image className="w-10 h-10 text-violet-400" /> : <FileText className="w-10 h-10 text-primary-400" />}
                    {doc.aiProcessed && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                        <CheckCircle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-xs text-slate-900 dark:text-white truncate">{doc.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{doc.size}</div>
                  <span className={cn('inline-block text-[10px] font-medium px-2 py-0.5 rounded-lg mt-1', getTypeColor(doc.category))}>
                    {doc.category}
                  </span>
                  {doc.claimNumber && <div className="text-[10px] text-primary-500 mt-1">{doc.claimNumber}</div>}
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
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
