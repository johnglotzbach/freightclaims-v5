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

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';
import { ChatbotWidget } from '@/components/ai/chatbot-widget';

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
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 animate-page-enter overflow-x-hidden">
          {children}
        </main>
      </div>
      <ChatbotWidget />
      <OnboardingTour />
    </div>
  );
}
