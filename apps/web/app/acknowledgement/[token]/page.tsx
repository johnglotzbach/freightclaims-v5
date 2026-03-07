'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  CheckCircle, AlertCircle, Truck, FileText,
  Calendar, DollarSign, Loader2,
} from 'lucide-react';

interface ClaimInfo {
  claimNumber: string;
  proNumber: string;
  claimAmount: number;
  filingDate: string;
  carrierName: string;
  shipperName: string;
  description?: string;
}

export default function AcknowledgementPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'submitted'>('loading');
  const [claim, setClaim] = useState<ClaimInfo | null>(null);
  const [response, setResponse] = useState<'acknowledge' | 'decline' | ''>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setClaim({
        claimNumber: 'CLM-2026-0042',
        proNumber: '059-2140',
        claimAmount: 3600,
        filingDate: '2025-09-02',
        carrierName: 'Central Transport LLC',
        shipperName: 'Armstrong Transport Group',
        description: 'Damage to electronics shipment during transit',
      });
      setStatus('valid');
    }, 1000);
  }, [token]);

  const handleSubmit = async () => {
    if (!response) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setStatus('submitted');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Validating acknowledgement link...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="card p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid Link</h1>
          <p className="text-sm text-slate-500">This acknowledgement link is expired or invalid. Please contact the claims team for assistance.</p>
        </div>
      </div>
    );
  }

  if (status === 'submitted') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="card p-8 max-w-md text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Response Submitted</h1>
          <p className="text-sm text-slate-500 mb-4">
            Your {response === 'acknowledge' ? 'acknowledgement' : 'response'} for claim {claim?.claimNumber} has been recorded.
            {referenceNumber && ` Reference: ${referenceNumber}`}
          </p>
          <p className="text-xs text-slate-400">You may close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">FC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Claim Acknowledgement</h1>
          <p className="text-sm text-slate-500 mt-1">Please review and acknowledge receipt of this freight claim</p>
        </div>

        {/* Claim Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Claim Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /><div><p className="text-xs text-slate-500">Claim Number</p><p className="text-sm font-medium">{claim?.claimNumber}</p></div></div>
            <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400" /><div><p className="text-xs text-slate-500">PRO Number</p><p className="text-sm font-mono font-medium">{claim?.proNumber}</p></div></div>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /><div><p className="text-xs text-slate-500">Claim Amount</p><p className="text-sm font-medium">${claim?.claimAmount?.toLocaleString()}</p></div></div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /><div><p className="text-xs text-slate-500">Filing Date</p><p className="text-sm font-medium">{claim?.filingDate}</p></div></div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
            <div><p className="text-xs text-slate-500">Shipper</p><p className="text-sm font-medium">{claim?.shipperName}</p></div>
            <div><p className="text-xs text-slate-500">Carrier</p><p className="text-sm font-medium">{claim?.carrierName}</p></div>
          </div>
          {claim?.description && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{claim.description}</p>
            </div>
          )}
        </div>

        {/* Response */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Your Response</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setResponse('acknowledge')}
              className={cn(
                'p-4 rounded-xl border-2 text-center transition-all',
                response === 'acknowledge' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              )}
            >
              <CheckCircle className={cn('w-6 h-6 mx-auto mb-2', response === 'acknowledge' ? 'text-emerald-500' : 'text-slate-400')} />
              <p className="text-sm font-semibold">Acknowledge</p>
              <p className="text-xs text-slate-500 mt-1">Accept and begin processing</p>
            </button>
            <button
              onClick={() => setResponse('decline')}
              className={cn(
                'p-4 rounded-xl border-2 text-center transition-all',
                response === 'decline' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
              )}
            >
              <AlertCircle className={cn('w-6 h-6 mx-auto mb-2', response === 'decline' ? 'text-red-500' : 'text-slate-400')} />
              <p className="text-sm font-semibold">Decline</p>
              <p className="text-xs text-slate-500 mt-1">Reject this claim</p>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Your Reference Number (optional)</label>
              <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Enter your internal reference..." className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional comments..." rows={3} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!response || submitting}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Submit Response
        </button>

        <p className="text-center text-xs text-slate-400">
          Powered by FreightClaims v5.0 &middot; <a href="https://freightclaims.com" className="text-primary-500">freightclaims.com</a>
        </p>
      </div>
    </div>
  );
}
