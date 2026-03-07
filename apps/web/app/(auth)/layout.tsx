/**
 * Auth Layout — Shared wrapper for login, register, and forgot-password pages.
 *
 * Split-screen layout: left panel with branding/testimonial,
 * right panel with the auth form. Mobile collapses to form-only.
 *
 * Location: apps/web/app/(auth)/layout.tsx
 */
import Link from 'next/link';
import { Truck, Shield, Brain, Clock } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-primary-900 text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">FreightClaims</span>
          </Link>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-3">The modern way to manage freight claims.</h2>
            <p className="text-primary-200 leading-relaxed">
              AI-powered automation, Carmack compliance, and real-time analytics —
              all in one platform built for claims professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: Brain, text: '7 specialized AI agents handle the heavy lifting' },
              { icon: Shield, text: 'Enterprise-grade security with multi-tenant isolation' },
              { icon: Clock, text: 'Automated Carmack deadline monitoring' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-primary-200" />
                </div>
                <span className="text-sm text-primary-100">{item.text}</span>
              </div>
            ))}
          </div>

          <blockquote className="border-l-2 border-primary-400 pl-4 py-1">
            <p className="text-primary-100 text-sm italic leading-relaxed mb-2">
              &ldquo;We onboarded in under a day and immediately started processing
              claims faster than we ever had. The AI compliance agent is a game-changer.&rdquo;
            </p>
            <footer className="text-primary-300 text-xs">
              — Sarah M., Claims Director at Summit Logistics
            </footer>
          </blockquote>
        </div>

        <div className="relative text-xs text-primary-400">
          &copy; 2026 FreightClaims.com &middot;{' '}
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link> &middot;{' '}
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
