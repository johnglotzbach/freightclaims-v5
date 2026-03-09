'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ClaimSummary {
  id: string;
  claimNumber: string;
  filingDate: string | null;
  claimAmount: number;
  description: string | null;
  claimType: string;
  status: string;
  carrierName: string;
  carrierPartyId: string | null;
}

type PageState = 'loading' | 'form' | 'success' | 'error';

export default function AcknowledgePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [claim, setClaim] = useState<ClaimSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [carrierClaimNumber, setCarrierClaimNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/acknowledge/${token}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.error || 'Unable to load claim information.');
          setState('error');
          return;
        }
        setClaim(data.claim);
        setState('form');
      } catch {
        setErrorMsg('Unable to connect. Please try again later.');
        setState('error');
      }
    }
    load();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/acknowledge/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrierClaimNumber, contactName, contactEmail, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Submission failed. Please try again.');
        setState('error');
        return;
      }
      setState('success');
    } catch {
      setErrorMsg('Unable to submit. Please try again later.');
      setState('error');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">FreightClaims</h1>
            <p className="text-xs text-slate-500">Carrier Claim Acknowledgment</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-4 text-sm text-slate-500">Loading claim details...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load</h2>
            <p className="text-slate-500">{errorMsg}</p>
          </div>
        )}

        {state === 'success' && (
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Acknowledgment Received</h2>
            <p className="text-slate-500 mb-6">
              Thank you for acknowledging claim <span className="font-semibold text-slate-700">{claim?.claimNumber}</span>.
              Your response has been recorded.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              If you have any questions, please contact the claimant directly or email{' '}
              <a href="mailto:support@freightclaims.com" className="text-blue-600 hover:underline">support@freightclaims.com</a>.
            </div>
          </div>
        )}

        {state === 'form' && claim && (
          <div className="space-y-6">
            {/* Claim Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-600 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">Claim Summary</h2>
                <p className="text-blue-200 text-sm">Please review the claim details and provide your acknowledgment below.</p>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Claim Number</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">{claim.claimNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filing Date</dt>
                    <dd className="mt-1 text-sm text-slate-900">{formatDate(claim.filingDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Claim Amount</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(claim.claimAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Carrier</dt>
                    <dd className="mt-1 text-sm text-slate-900">{claim.carrierName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Claim Type</dt>
                    <dd className="mt-1 text-sm text-slate-900 capitalize">{(claim.claimType || '').replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {(claim.status || '').replace('_', ' ')}
                      </span>
                    </dd>
                  </div>
                  {claim.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Description</dt>
                      <dd className="mt-1 text-sm text-slate-700">{claim.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Acknowledgment Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-900">Carrier Acknowledgment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Fields marked with * are required.</p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label htmlFor="carrierClaimNumber" className="block text-sm font-medium text-slate-700 mb-1">
                    Carrier Claim Number
                  </label>
                  <input
                    id="carrierClaimNumber"
                    type="text"
                    value={carrierClaimNumber}
                    onChange={(e) => setCarrierClaimNumber(e.target.value)}
                    placeholder="Your internal claim/reference number"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactName" className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contactName"
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contactEmail"
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your.email@carrier.com"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional comments or notes regarding this claim..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Acknowledgment'}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-slate-400">
              Powered by <span className="font-semibold">FreightClaims</span> &mdash; AI-Powered Freight Claims Management
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
