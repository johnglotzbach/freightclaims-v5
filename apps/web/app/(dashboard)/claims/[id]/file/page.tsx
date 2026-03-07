'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { get, post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FileText, Send, CheckCircle, AlertTriangle,
  Mail, Upload, Eye, ArrowLeft, Loader2,
} from 'lucide-react';
import type { Claim } from 'shared';
import { formatCurrency, formatDate } from 'shared';

export default function FileClaimPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sendEmail, setSendEmail] = useState(true);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [filing, setFiling] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const { data: claim, isLoading } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => get<Claim>(`/claims/${id}`),
    enabled: !!id,
  });

  const fileMutation = useMutation({
    mutationFn: () => post(`/claims/${id}/file`, {
      sendEmail,
      partyIds: selectedParties,
      notes: additionalNotes,
    }),
    onSuccess: () => {
      toast.success('Claim filed successfully!');
      router.push(`/claims/${id}`);
    },
    onError: () => toast.error('Failed to file claim'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>;
  }

  const parties = claim?.parties || [];
  const carriers = parties.filter((p: any) => p.type === 'carrier');
  const documents = claim?.documents || [];
  const missingDocs: string[] = [];
  if (!documents.some((d: any) => d.mimeType?.includes('bol') || d.documentName?.toLowerCase().includes('bol'))) missingDocs.push('Bill of Lading');
  if (!documents.some((d: any) => d.mimeType?.includes('invoice') || d.documentName?.toLowerCase().includes('invoice'))) missingDocs.push('Invoice');

  const validationIssues: string[] = [];
  if (!claim?.claimAmount || claim.claimAmount <= 0) validationIssues.push('Claim amount must be greater than $0');
  if (carriers.length === 0) validationIssues.push('At least one carrier party is required');
  if (documents.length === 0) validationIssues.push('At least one document is required');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/claims/${id}`} className="hover:text-primary-500 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to Claim</Link>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">File Claim {claim?.claimNumber}</h1>
        <p className="text-sm text-slate-500 mt-1">Review the claim details and file with the carrier</p>
      </div>

      {/* Validation Warnings */}
      {validationIssues.length > 0 && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-500/5">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Filing Issues</h3>
          <ul className="space-y-1">
            {validationIssues.map(issue => <li key={issue} className="text-xs text-red-700 dark:text-red-400">• {issue}</li>)}
          </ul>
        </div>
      )}

      {missingDocs.length > 0 && (
        <div className="card p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-500/5">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Missing Recommended Documents</h3>
          <ul className="space-y-1">
            {missingDocs.map(doc => <li key={doc} className="text-xs text-amber-700 dark:text-amber-400">• {doc}</li>)}
          </ul>
        </div>
      )}

      {/* Claim Summary */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Claim Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-slate-500">Claim #</p><p className="text-sm font-medium">{claim?.claimNumber}</p></div>
          <div><p className="text-xs text-slate-500">PRO #</p><p className="text-sm font-mono font-medium">{claim?.proNumber || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Amount</p><p className="text-sm font-medium">{formatCurrency(claim?.claimAmount || 0)}</p></div>
          <div><p className="text-xs text-slate-500">Documents</p><p className="text-sm font-medium">{documents.length} attached</p></div>
        </div>
      </div>

      {/* Select Carrier Parties */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">File With Carriers</h3>
        {carriers.length > 0 ? (
          <div className="space-y-2">
            {carriers.map((party: any) => (
              <label key={party.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                <input
                  type="checkbox"
                  checked={selectedParties.includes(party.id)}
                  onChange={(e) => setSelectedParties(e.target.checked ? [...selectedParties, party.id] : selectedParties.filter(id => id !== party.id))}
                  className="rounded border-slate-300 text-primary-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{party.name}</p>
                  {party.scacCode && <p className="text-xs text-slate-500 font-mono">{party.scacCode}</p>}
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No carrier parties added to this claim</p>
        )}
      </div>

      {/* Email Options */}
      <div className="card p-6">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Send Email Notification</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automatically email the claim form to selected carriers</p>
          </div>
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded border-slate-300 text-primary-500 w-5 h-5" />
        </label>
      </div>

      {/* Additional Notes */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Additional Notes</h3>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Optional notes to include with the filing..."
          rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href={`/claims/${id}`} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</Link>
        <div className="flex gap-3">
          <button onClick={() => setPreviewMode(!previewMode)} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={() => fileMutation.mutate()}
            disabled={validationIssues.length > 0 || fileMutation.isPending}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {fileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            File Claim
          </button>
        </div>
      </div>
    </div>
  );
}
