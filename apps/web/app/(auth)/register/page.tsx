/**
 * Registration Page — Multi-step signup flow
 *
 * Step 1: Account details (name, email, password)
 * Step 2: Company info (company name, role, size)
 * Step 3: Confirmation
 *
 * Location: apps/web/app/(auth)/register/page.tsx
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import {
  Truck, User, Building2, CheckCircle2, ArrowRight, ArrowLeft, Eye, EyeOff,
} from 'lucide-react';

type Step = 1 | 2 | 3;

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    jobTitle: '',
    companySize: '',
    phone: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canProceedStep1() {
    return form.firstName && form.lastName && form.email && form.password.length >= 8;
  }

  function canProceedStep2() {
    return form.companyName && form.jobTitle;
  }

  async function handleSubmit() {
    setIsLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        companyName: form.companyName || undefined,
        jobTitle: form.jobTitle || undefined,
        companySize: form.companySize || undefined,
        phone: form.phone || undefined,
      });
      setStep(3);
      toast.success('Account created successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('duplicate') || message.includes('exists') || message.includes('409')) {
        toast.error('An account with this email already exists. Try logging in instead.');
      } else if (message.includes('network') || message.includes('fetch')) {
        toast.error('Network error — please check your connection and try again.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
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

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= s
                ? 'bg-primary-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-0.5 rounded ${step > s ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-8">
        {/* Step 1: Account Details */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create your account</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Start your 14-day free trial</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                    placeholder="John"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                    placeholder="Doe"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Work email
                </label>
                <input
                  id="regEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                  placeholder="john@company.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="regPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        form.password.length >= i * 3
                          ? form.password.length >= 12
                            ? 'bg-emerald-500'
                            : form.password.length >= 8
                              ? 'bg-amber-500'
                              : 'bg-red-400'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {form.password.length < 8 ? `${8 - form.password.length} more characters needed` : 'Strong password'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1()}
                className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Company Info */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">About your company</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Help us tailor your workspace</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Company name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                  placeholder="Acme Logistics"
                  required
                  autoComplete="organization"
                />
              </div>

              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Your role
                </label>
                <select
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => update('jobTitle', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700"
                >
                  <option value="">Select your role</option>
                  <option value="claims_manager">Claims Manager / Director</option>
                  <option value="claims_handler">Claims Handler / Analyst</option>
                  <option value="operations">Operations Manager</option>
                  <option value="logistics_coordinator">Logistics Coordinator</option>
                  <option value="executive">Executive / Owner</option>
                  <option value="it">IT / Developer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="companySize" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Company size
                </label>
                <select
                  id="companySize"
                  value={form.companySize}
                  onChange={(e) => update('companySize', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700"
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="51-200">51–200 employees</option>
                  <option value="201-500">201–500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone number <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceedStep2() || isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">You&apos;re all set!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              Your FreightClaims account has been created.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
              We&apos;ve sent a verification link to <strong className="text-slate-700 dark:text-slate-200">{form.email}</strong>.
              Please check your inbox and verify your email, then sign in to get started.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-md shadow-primary-500/20"
            >
              Go to Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-500 hover:text-primary-600 font-semibold">Sign in</Link>
      </p>

      {step < 3 && (
        <p className="text-center text-xs text-slate-400 mt-3">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-primary-500 hover:underline">Terms</Link> and{' '}
          <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>.
        </p>
      )}
    </>
  );
}
