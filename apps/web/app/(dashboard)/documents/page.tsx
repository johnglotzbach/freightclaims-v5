'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import { PdfViewer } from '@/components/pdf-viewer';
import {
  FileText, Search, Upload, Download, Eye, Trash2,
  FolderOpen, Image, Brain, List, Grid,
  CheckCircle, TrendingUp,
} from 'lucide-react';

const CATEGORIES = [
  'All', 'Bill of Lading', 'Proof of Delivery', 'Invoice', 'Damage Photos',
  'Inspection Report', 'Carrier Response', 'Settlement', 'Correspondence',
];

interface Document {
  id: string;
  name: string;
  category: string;
  claimNumber: string;
  uploadedBy: string;
  date: string;
  size: string;
  type: 'pdf' | 'image';
  aiProcessed: boolean;
  confidence?: number;
}

function getTypeColor(category: string) {
  const colors: Record<string, string> = {
    'Bill of Lading': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    'Product Invoice': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    'Invoice': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    'Proof of Delivery': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    'Delivery Receipt': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    'Damage Photos': 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    'Other': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return colors[category] || colors['Other'];
}

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<string[]>([]);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string } | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => get<Document[]>('/documents'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton count={2} />
        <TableSkeleton />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary-500" /> Documents
            </h1>
          </div>
          <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Upload className="w-4 h-4" /> Upload Documents
          </button>
        </div>
        <EmptyState
          icon={FolderOpen}
          title="No documents yet"
          description="Upload documents to get started with AI-powered extraction and categorization."
        />
      </div>
    );
  }

  const aiProcessedDocs = docs.filter(d => d.aiProcessed);
  const categorizationAccuracy = aiProcessedDocs.length > 0
    ? Math.round(aiProcessedDocs.reduce((acc, d) => acc + (d.confidence || 0), 0) / aiProcessedDocs.length * 100)
    : 0;
  const dataCaptureAccuracy = 96;

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || (d.claimNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || d.category === category;
    return matchSearch && matchCat;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  async function handleView(doc: Document) {
    try {
      const { url } = await get<{ url: string }>(`/documents/${doc.id}/url`);
      setViewingDoc({ url, name: doc.name });
    } catch {
      window.open(`/api/v1/documents/${doc.id}/url`, '_blank');
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const { url } = await get<{ url: string }>(`/documents/${doc.id}/url`);
      window.open(url, '_blank');
    } catch {
      window.open(`/api/v1/documents/${doc.id}/url`, '_blank');
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
        </div>
        <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Upload className="w-4 h-4" /> Upload Documents
        </button>
      </div>

      {/* Accuracy Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Categorization Accuracy</h3>
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +1% past month
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
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Data Capture Accuracy</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${dataCaptureAccuracy}%` }}
              />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{dataCaptureAccuracy}%</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Only PDF document format supported. Information is being extracted only from the BOL, Product Invoice, and POD documents.
      </p>

      {/* Category Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
        {CATEGORIES.map((cat) => {
          const count = cat === 'All' ? docs.length : docs.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'p-2.5 rounded-xl border text-center text-xs transition-all',
                category === cat
                  ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
              )}
            >
              <div className="font-bold text-base text-slate-900 dark:text-white">{count}</div>
              <div className="truncate">{cat}</div>
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
            <button className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-2">
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Uploaded By</th>
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
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-primary-500 font-medium">{doc.claimNumber}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-xs text-slate-500">Uploaded by: {doc.uploadedBy}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                      {new Date(doc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleView(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Preview"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleDownload(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500" title="Download"><Download className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-violet-500" title="AI Extract"><Brain className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
              <div className="text-[10px] text-primary-500 mt-1">{doc.claimNumber}</div>
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleView(doc)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDownload(doc)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"><Download className="w-3.5 h-3.5" /></button>
                <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
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
