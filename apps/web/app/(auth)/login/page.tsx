'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { LogIn, Truck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.push('/claims');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('network') || message.includes('fetch')) {
        toast.error('Network error — please check your connection and try again');
      } else if (message.includes('locked') || message.includes('suspended')) {
        toast.error('Account locked. Contact support@freightclaims.com for help.');
      } else if (message.includes('429') || message.includes('rate')) {
        toast.error('Too many attempts. Please wait a moment and try again.');
      } else {
        toast.error('Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-900 dark:text-white">FreightClaims</span>
      </div>

      <div className="card p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Sign in to your FreightClaims account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm" placeholder="you@company.com" required autoComplete="email" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-primary-500 hover:text-primary-600 font-medium">Forgot password?</Link>
            </div>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm" placeholder="••••••••" required autoComplete="current-password" />
          </div>

          <div className="flex items-center gap-2">
            <input id="remember" type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500" />
            <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400">Remember me for 30 days</label>
          </div>

          <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20">
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-slate-800 px-3 text-slate-400">or</span></div>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-500 hover:text-primary-600 font-semibold">Create one free</Link>
        </p>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Need help? <Link href="/support" className="text-primary-500 hover:underline">Visit our support center</Link>
      </p>
    </>
  );
}
