/**
 * Dashboard Layout - Responsive protected layout with sidebar + header
 *
 * Desktop: Fixed sidebar + scrollable content
 * Mobile: Bottom nav hint + hamburger → drawer sidebar
 * Handles authentication redirect and permission context.
 *
 * Location: apps/web/app/(dashboard)/layout.tsx
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ClientErrorBoundary } from '@/components/error-boundary';

const OnboardingTour = dynamic(
  () => import('@/components/onboarding/onboarding-tour').then((m) => ({ default: m.OnboardingTour })),
  { ssr: false },
);
const ChatbotWidget = dynamic(
  () => import('@/components/ai/chatbot-widget').then((m) => ({ default: m.ChatbotWidget })),
  { ssr: false },
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    loadUser().finally(() => setInitialCheckDone(true));
  }, [loadUser]);

  useEffect(() => {
    if (initialCheckDone && !isAuthenticated) router.push('/login');
  }, [initialCheckDone, isAuthenticated, router]);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  if (!initialCheckDone || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading FreightClaims...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <ClientErrorBoundary>
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      </ClientErrorBoundary>

      <div className="flex-1 flex flex-col min-w-0">
        <ClientErrorBoundary>
          <Header onMenuClick={() => setMobileMenuOpen(true)} />
        </ClientErrorBoundary>
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
      <ClientErrorBoundary>
        <ChatbotWidget />
      </ClientErrorBoundary>
      <ClientErrorBoundary>
        <OnboardingTour />
      </ClientErrorBoundary>
    </div>
  );
}
