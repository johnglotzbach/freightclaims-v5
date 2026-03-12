'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/users/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not connect to the server. Please try again.');
      });
  }, [token]);

  async function handleResend() {
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      await fetch(`${apiUrl}/users/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      setMessage('If that email exists, a new verification link has been sent.');
    } catch {
      setMessage('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-8 text-center">

        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verifying your email...</h1>
            <p className="text-sm text-slate-500">Please wait while we confirm your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Email Verified!</h1>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verification Failed</h1>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Need a new verification link?</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                />
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend'}
                </button>
              </div>
            </div>
            <Link href="/login" className="inline-block mt-4 text-sm text-primary-500 hover:text-primary-600 font-medium">
              Back to Login
            </Link>
          </>
        )}

        {status === 'no-token' && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Verification Token</h1>
            <p className="text-sm text-slate-500 mb-6">
              Please use the link from your verification email, or request a new one below.
            </p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                />
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend'}
                </button>
              </div>
            </div>
            <Link href="/login" className="inline-block mt-4 text-sm text-primary-500 hover:text-primary-600 font-medium">
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
