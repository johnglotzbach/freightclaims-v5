'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  X, ChevronRight, ChevronLeft, Check, Sparkles, FileText,
  Mail, Users, Bot, BarChart3, Settings, HelpCircle,
} from 'lucide-react';

interface OnboardingState {
  id: string;
  completedSteps: string[];
  dismissedTours: string[];
  currentStep: string | null;
  profileCompleted: boolean;
  firstClaimFiled: boolean;
  emailConfigured: boolean;
  teamInvited: boolean;
  aiTested: boolean;
  completedAt: string | null;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon: any;
}

const WELCOME_TOUR: TourStep[] = [
  { id: 'welcome', title: 'Welcome to FreightClaims', description: 'Let\'s take a quick tour of the platform. We\'ll show you the key features to get you started.', icon: Sparkles },
  { id: 'claims', title: 'Claims Management', description: 'Create, track, and manage freight claims all in one place. Use the sidebar to navigate to Claims.', icon: FileText },
  { id: 'ai', title: 'AI-Powered Tools', description: 'Our AI automatically extracts data from documents, predicts outcomes, and helps draft carrier correspondence.', icon: Bot },
  { id: 'email', title: 'Email Integration', description: 'Send and receive emails directly from claims. Forward claim emails to auto-create new claims.', icon: Mail },
  { id: 'reports', title: 'Reports & Insights', description: 'Track performance with dashboards, analytics, and custom reports. Export data anytime.', icon: BarChart3 },
  { id: 'team', title: 'Team Management', description: 'Invite team members, assign roles, and control who can access what through granular permissions.', icon: Users },
  { id: 'settings', title: 'Settings', description: 'Configure your profile, email templates, API integrations, and more in Settings.', icon: Settings },
  { id: 'help', title: 'Need Help?', description: 'Visit the Help Center anytime, or use the AI chatbot in the bottom-right corner for instant answers.', icon: HelpCircle },
];

export function OnboardingTour() {
  const queryClient = useQueryClient();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => get<{ data: OnboardingState }>('/onboarding/me').then((r) => r.data),
  });

  const dismissMutation = useMutation({
    mutationFn: (tour: string) => post('/onboarding/me/dismiss-tour', { tour }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding'] }),
  });

  const completeMutation = useMutation({
    mutationFn: (step: string) => post('/onboarding/me/complete-step', { step }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding'] }),
  });

  useEffect(() => {
    if (onboarding && !onboarding.completedAt && !onboarding.dismissedTours.includes('welcome')) {
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [onboarding]);

  const handleNext = () => {
    if (currentStepIndex < WELCOME_TOUR.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((i) => i - 1);
  };

  const handleSkip = () => {
    dismissMutation.mutate('welcome');
    setShowTour(false);
  };

  const handleFinish = () => {
    completeMutation.mutate('welcome_tour');
    dismissMutation.mutate('welcome');
    setShowTour(false);
  };

  if (!showTour) return null;

  const step = WELCOME_TOUR[currentStepIndex];
  const isLast = currentStepIndex === WELCOME_TOUR.length - 1;
  const Icon = step.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />

      {/* Tour Dialog */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / WELCOME_TOUR.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-4">
              <Icon className="w-7 h-7 text-primary-500" />
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mt-6 mb-4">
              {WELCOME_TOUR.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === currentStepIndex ? 'w-6 bg-primary-500' : i < currentStepIndex ? 'w-1.5 bg-primary-300' : 'w-1.5 bg-slate-200 dark:bg-slate-600'
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Skip tour
              </button>
              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  {isLast ? (
                    <><Check className="w-4 h-4" /> Get Started</>
                  ) : (
                    <>Next <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Persistent checklist widget shown in the sidebar/dashboard */
export function OnboardingChecklist() {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => get<{ data: OnboardingState }>('/onboarding/me').then((r) => r.data),
    retry: false,
  });

  const skipMutation = useMutation({
    mutationFn: () => post('/onboarding/me/dismiss-tour', { tour: 'checklist' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      setDismissed(true);
    },
  });

  if (dismissed || !onboarding || onboarding.completedAt) return null;
  if (onboarding.dismissedTours?.includes('checklist')) return null;

  const steps = [
    { key: 'profileCompleted', label: 'Complete your profile', href: '/settings/profile', done: onboarding.profileCompleted },
    { key: 'firstClaimFiled', label: 'File your first claim', href: '/claims/new', done: onboarding.firstClaimFiled },
    { key: 'emailConfigured', label: 'Configure email settings', href: '/settings', done: onboarding.emailConfigured },
    { key: 'teamInvited', label: 'Invite team members', href: '/settings/users', done: onboarding.teamInvited },
    { key: 'aiTested', label: 'Try the AI features', href: '/ai', done: onboarding.aiTested },
  ];

  const completed = steps.filter((s) => s.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="card p-4 border-primary-200/50 dark:border-primary-500/20 bg-gradient-to-br from-primary-50/50 to-transparent dark:from-primary-500/5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Getting Started</h4>
        <span className="text-xs font-medium text-primary-500">{progress}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-3">
        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="space-y-1.5">
        {steps.map((step) => (
          <Link
            key={step.key}
            href={step.done ? '#' : step.href}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors -mx-1',
              step.done
                ? 'cursor-default'
                : 'hover:bg-primary-50/50 dark:hover:bg-primary-500/5 cursor-pointer'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
              step.done
                ? 'bg-emerald-500 text-white'
                : 'border-2 border-slate-300 dark:border-slate-600'
            )}>
              {step.done && <Check className="w-3 h-3" />}
            </div>
            <span className={cn(
              'text-xs flex-1',
              step.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'
            )}>
              {step.label}
            </span>
            {!step.done && <ChevronRight className="w-3 h-3 text-slate-400" />}
          </Link>
        ))}
      </div>
      <button
        onClick={() => skipMutation.mutate()}
        className="w-full mt-3 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
      >
        Skip Getting Started
      </button>
    </div>
  );
}
