'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getList } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Upload, FileText, CheckCircle, AlertCircle, ChevronRight,
  Sparkles, Eye, RotateCcw, Check, X as XIcon, Search,
  ArrowLeft, ZoomIn, ZoomOut, ChevronLeft,
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
  fileName: string;
  documentType: string;
  confidence: number;
  pages: number;
  extractedFields: ExtractedField[];
  status: 'pending' | 'processing' | 'completed' | 'review' | 'approved';
  previewUrl?: string;
  claimId?: string;
  claimNumber?: string;
  uploadedBy: string;
  uploadedAt: string;
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    'Bill of Lading': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    'Product Invoice': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    'Proof of Delivery': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    'Delivery Receipt': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    'Other': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return colors[type] || colors['Other'];
}

function getStatusIcon(status: string) {
  if (status === 'approved' || status === 'completed') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'review') return <Eye className="w-4 h-4 text-amber-500" />;
  if (status === 'processing') return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
  return <AlertCircle className="w-4 h-4 text-slate-400" />;
}

export default function AIEntryPage() {
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null);
  const [search, setSearch] = useState('');
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['ai-documents'],
    queryFn: () => getList<ProcessedDocument>('/ai/documents'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton count={2} />
        <TableSkeleton />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary-500" /> AI Entry
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Information is being extracted only from the BOL, Product Invoice, and POD documents.
            </p>
          </div>
          <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Upload className="w-4 h-4" /> Upload Documents
          </button>
        </div>
        <EmptyState
          icon={Sparkles}
          title="No AI-processed documents"
          description="Upload documents to begin AI-powered data extraction and review."
        />
      </div>
    );
  }

  const categorizationAccuracy = Math.round(
    documents.reduce((acc, d) => acc + d.confidence, 0) / documents.length * 100
  );

  const allFields = documents.flatMap(d => d.extractedFields ?? []);
  const dataCaptureAccuracy = allFields.length > 0
    ? Math.round(allFields.reduce((acc, f) => acc + (f.confidence ?? 0), 0) / allFields.length * 100)
    : 0;

  const filtered = documents.filter(d =>
    d.fileName.toLowerCase().includes(search.toLowerCase()) ||
    d.documentType.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedDoc) {
    return (
      <ReviewDataCapture
        document={selectedDoc}
        allDocuments={documents}
        editingFields={editingFields}
        setEditingFields={setEditingFields}
        onBack={() => setSelectedDoc(null)}
        onApprove={() => {
          setSelectedDoc(null);
        }}
        onSelectDoc={setSelectedDoc}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-500" /> AI Entry
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Information is being extracted only from the BOL, Product Invoice, and POD documents.
          </p>
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
            <span className="text-xs text-emerald-500 font-medium">+1% past month</span>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        />
      </div>

      {/* Document List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Uploaded By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" className="rounded" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-xs">{doc.fileName}</div>
                        <div className="text-xs text-slate-400">{doc.pages} page{doc.pages > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg', getTypeColor(doc.documentType))}>
                      {doc.documentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-xs text-slate-500">Uploaded by: {doc.uploadedBy}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(doc.status)}
                      <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{doc.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      Review <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  onSelectDoc,
}: {
  document: ProcessedDocument;
  allDocuments: ProcessedDocument[];
  editingFields: Record<string, string>;
  setEditingFields: (f: Record<string, string>) => void;
  onBack: () => void;
  onApprove: () => void;
  onSelectDoc: (d: ProcessedDocument) => void;
}) {
  const [activeDocTab, setActiveDocTab] = useState(doc.documentType.toLowerCase().replace(/ /g, '_'));
  const [zoom, setZoom] = useState(100);

  const docTabs = allDocuments
    .filter(d => d.status === 'review')
    .reduce((acc, d) => {
      const key = d.documentType.toLowerCase().replace(/ /g, '_');
      if (!acc.find(t => t.key === key)) {
        acc.push({ key, label: d.documentType, confidence: d.confidence, doc: d });
      }
      return acc;
    }, [] as { key: string; label: string; confidence: number; doc: ProcessedDocument }[]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <XIcon className="w-5 h-5 text-slate-500" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Review Data Capture</h1>
      </div>

      <p className="text-sm text-slate-500">
        Information is being extracted only from the BOL, Product Invoice, and POD documents.
      </p>

      {/* Document Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {docTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveDocTab(tab.key);
              onSelectDoc(tab.doc);
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
              activeDocTab === tab.key
                ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm'
                : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            {doc.status === 'approved' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
            )}
            <span>{tab.label.toLowerCase().replace(/_/g, '-')}</span>
            <span className="text-xs text-slate-400">Pages {tab.doc.pages}</span>
            <span className={cn(
              'text-xs font-medium',
              tab.confidence >= 0.95 ? 'text-emerald-500' : tab.confidence >= 0.85 ? 'text-amber-500' : 'text-red-500'
            )}>
              {Math.round(tab.confidence * 100)}%
            </span>
          </button>
        ))}
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
        {/* Left - Document Type Label */}
        <div className="card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              {doc.documentType}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8 overflow-auto">
            <div
              className="bg-white dark:bg-slate-800 shadow-lg rounded-lg w-full max-w-lg aspect-[8.5/11] flex items-center justify-center border border-slate-200 dark:border-slate-700"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
            >
              <div className="text-center p-8">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-sm text-slate-500 font-medium">{doc.fileName}</p>
                <p className="text-xs text-slate-400 mt-1">PDF document preview</p>
                <p className="text-xs text-slate-400 mt-1">Page 1 of {doc.pages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Extracted Fields */}
        <div className="card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Extracted Data</h3>
            <span className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              doc.confidence >= 0.95
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
            )}>
              {Math.round(doc.confidence * 100)}% confidence
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {(doc.extractedFields ?? []).map((field) => (
                <div key={field.key} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{field.label}</label>
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      field.confidence >= 0.95
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : field.confidence >= 0.85
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    )}>
                      {Math.round(field.confidence * 100)}%
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editingFields[`${doc.id}-${field.key}`] ?? field.value}
                    onChange={(e) => setEditingFields({ ...editingFields, [`${doc.id}-${field.key}`]: e.target.value })}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
                      editingFields[`${doc.id}-${field.key}`] !== undefined && editingFields[`${doc.id}-${field.key}`] !== field.value
                        ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/30'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800'
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Save Draft
              </button>
              <button
                onClick={onApprove}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" /> Approve & Create Claim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
