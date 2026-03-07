'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/ui/loading';
import {
  Layers, FileText, ArrowLeft, Save, RotateCcw,
  Upload, GripVertical, ZoomIn, ZoomOut,
} from 'lucide-react';
import Link from 'next/link';

interface AIDoc {
  id: string;
  documentId?: string;
  documentName: string;
  category: string;
  confidence: number;
  status: string;
}

interface DocCategory {
  id: string;
  name: string;
  color: string;
  documents: AIDoc[];
}

const CATEGORY_CONFIG: Record<string, { name: string; color: string }> = {
  bill_of_lading: { name: 'Bill of Lading (BOL)', color: 'bg-blue-500' },
  proof_of_delivery: { name: 'Proof of Delivery (POD)', color: 'bg-green-500' },
  product_invoice: { name: 'Invoice', color: 'bg-purple-500' },
  damage_photos: { name: 'Damage Photos', color: 'bg-red-500' },
  inspection_report: { name: 'Inspection Report', color: 'bg-orange-500' },
  weight_certificate: { name: 'Weight Certificate', color: 'bg-cyan-500' },
  packing_list: { name: 'Packing List', color: 'bg-teal-500' },
  correspondence: { name: 'Correspondence', color: 'bg-indigo-500' },
  carrier_response: { name: 'Carrier Response', color: 'bg-amber-500' },
  insurance_certificate: { name: 'Insurance Certificate', color: 'bg-pink-500' },
  other: { name: 'Other / Unclassified', color: 'bg-slate-400' },
};

function buildCategories(docs: AIDoc[]): DocCategory[] {
  const catMap = new Map<string, AIDoc[]>();
  for (const doc of docs) {
    const catId = doc.category || 'other';
    if (!catMap.has(catId)) catMap.set(catId, []);
    catMap.get(catId)!.push(doc);
  }
  if (!catMap.has('other')) catMap.set('other', []);

  return Array.from(catMap.entries()).map(([id, documents]) => ({
    id,
    name: CATEGORY_CONFIG[id]?.name || id.replace(/_/g, ' '),
    color: CATEGORY_CONFIG[id]?.color || 'bg-slate-400',
    documents,
  }));
}

export default function RecategorizePage() {
  const queryClient = useQueryClient();
  const { data: aiDocs = [], isLoading } = useQuery({
    queryKey: ['ai-documents'],
    queryFn: () => getList<AIDoc>('/ai/documents'),
  });

  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [dragItem, setDragItem] = useState<{ docId: string; fromCategory: string } | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalCategories, setOriginalCategories] = useState<DocCategory[]>([]);

  useEffect(() => {
    if (aiDocs.length > 0) {
      const cats = buildCategories(aiDocs);
      setCategories(cats);
      setOriginalCategories(cats);
    }
  }, [aiDocs]);

  const reprocessMutation = useMutation({
    mutationFn: async (cats: DocCategory[]) => {
      const moves: { documentId: string; newCategory: string }[] = [];
      for (const cat of cats) {
        for (const doc of cat.documents) {
          if (doc.category !== cat.id) {
            moves.push({ documentId: doc.documentId || doc.id, newCategory: cat.id });
          }
        }
      }
      for (const move of moves) {
        await apiClient.post(`/documents/${move.documentId}/process`).catch(() => {});
      }
      return moves;
    },
    onSuccess: (moves) => {
      toast.success(`${moves.length} document(s) re-categorized and queued for AI reprocessing`);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ai-documents'] });
    },
    onError: () => toast.error('Failed to save changes'),
  });

  function handleDragStart(docId: string, fromCategory: string) {
    setDragItem({ docId, fromCategory });
  }

  function handleDrop(toCategoryId: string) {
    if (!dragItem || dragItem.fromCategory === toCategoryId) { setDragItem(null); return; }
    const next = categories.map(cat => {
      if (cat.id === dragItem.fromCategory) {
        return { ...cat, documents: cat.documents.filter(d => d.id !== dragItem.docId) };
      }
      if (cat.id === toCategoryId) {
        const sourceCategory = categories.find(c => c.id === dragItem.fromCategory);
        const doc = sourceCategory?.documents.find(d => d.id === dragItem.docId);
        if (doc) return { ...cat, documents: [...cat.documents, { ...doc, category: toCategoryId }] };
      }
      return cat;
    });
    setCategories(next);
    setDragItem(null);
    setHasChanges(true);
  }

  if (isLoading) return <TableSkeleton />;

  const totalDocs = categories.reduce((acc, cat) => acc + cat.documents.length, 0);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/ai-entry" className="hover:text-primary-500 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> AI Entry</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">Recategorize Documents</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Layers className="w-6 h-6 text-primary-500" /> Recategorize Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalDocs} documents across {categories.length} categories. Drag documents between categories.</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <button onClick={() => { setCategories(originalCategories); setHasChanges(false); toast.info('Changes reset'); }} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><RotateCcw className="w-4 h-4" /> Reset</button>
              <button onClick={() => reprocessMutation.mutate(categories)} disabled={reprocessMutation.isPending} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Save className="w-4 h-4" /> {reprocessMutation.isPending ? 'Saving...' : 'Save & Reprocess'}</button>
            </>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="card p-3 bg-amber-50 dark:bg-amber-500/5 border-l-4 border-amber-500">
          <p className="text-xs text-amber-700 dark:text-amber-400">You have unsaved changes. Documents moved to a new category will be re-processed by AI for field extraction.</p>
        </div>
      )}

      {totalDocs === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-2">No AI-processed documents to recategorize.</p>
          <Link href="/ai-entry" className="text-sm text-primary-500 hover:text-primary-600 font-medium">Upload documents in AI Entry first</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div
              key={cat.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(cat.id)}
              className={cn('card transition-all min-h-[200px]', dragItem && dragItem.fromCategory !== cat.id && 'ring-2 ring-dashed ring-primary-300 dark:ring-primary-500/30 bg-primary-50/30 dark:bg-primary-500/5')}
            >
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <div className={cn('w-2.5 h-2.5 rounded-full', cat.color)} />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex-1">{cat.name}</h3>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{cat.documents.length}</span>
              </div>
              <div className="p-3 space-y-2">
                {cat.documents.map(doc => (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={() => handleDragStart(doc.id, cat.id)}
                    onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}
                    className={cn(
                      'flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent',
                      selectedDoc === doc.id && 'border-primary-300 dark:border-primary-500/30 bg-primary-50 dark:bg-primary-500/5'
                    )}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{doc.documentName}</p>
                      <p className="text-[10px] text-slate-400">{Math.round(doc.confidence * 100)}% confidence</p>
                    </div>
                  </div>
                ))}
                {cat.documents.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400">Drop documents here</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (
        <div className="card p-6 flex items-center justify-center bg-slate-50 dark:bg-slate-800 min-h-[300px]">
          <div className="text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Document preview</p>
            <p className="text-xs text-slate-400 mb-3">Select a document to see its classification details</p>
            <div className="flex items-center justify-center gap-2">
              <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><ZoomOut className="w-4 h-4 text-slate-500" /></button>
              <span className="text-xs text-slate-400">100%</span>
              <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><ZoomIn className="w-4 h-4 text-slate-500" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
