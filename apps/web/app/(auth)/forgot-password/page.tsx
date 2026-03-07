/**
 * Forgot Password Page — Email-based password recovery flow
 *
 * User enters their email, receives a reset link, then sets a new password.
 * Shows success state immediately (for security, always show success
 * regardless of whether the email exists).
 *
 * Location: apps/web/app/(auth)/forgot-password/page.tsx
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { post } from '@/lib/api-client';
import { toast } from 'sonner';
import { Truck, Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await post('/users/forgot-password', { email });
    } catch {
      // Always show success for security (don't reveal whether email exists)
    } finally {
      setIsLoading(false);
      setSent(true);
      toast.success('If that email is registered, you\'ll receive a reset link.');
    }
  }

  return (
    <>
      {/* Mobile-only logo */}
      <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-900 dark:text-white">FreightClaims</span>
      </div>

      <div className="card p-8">
        {!sent ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reset your password</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">We&apos;ll send you a reset link</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
              If <strong className="text-slate-700 dark:text-slate-200">{email}</strong> is registered,
              you&apos;ll receive a password reset link shortly.
            </p>
            <p className="text-slate-400 text-xs mb-6">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                onClick={() => setSent(false)}
                className="text-primary-500 hover:underline font-medium"
              >
                try again
              </button>.
            </p>
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-md shadow-primary-500/20"
            >
              Back to Sign In
            </Link>
          </div>
        )}
      </div>

      {!sent && (
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mt-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      )}

      <p className="text-center text-xs text-slate-400 mt-4">
        Need help? <Link href="/support" className="text-primary-500 hover:underline">Contact support</Link>
      </p>
    </>
  );
}
