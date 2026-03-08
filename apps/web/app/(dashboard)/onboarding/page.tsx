/**
 * Onboarding Wizard — Guided first-time setup after account creation
 *
 * Four-step wizard that walks a new user through:
 *   1. Welcome / confirm profile
 *   2. Company & workspace setup
 *   3. Invite team members
 *   4. Choose preferences (document types, notification settings)
 *
 * On completion, redirects to the main dashboard.
 *
 * Location: apps/web/app/(dashboard)/onboarding/page.tsx
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { post } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Truck, User, Building2, Users, Settings2, ArrowRight, ArrowLeft,
  CheckCircle2, Plus, X, Mail, Bell, FileText, Shield, Brain,
  Sparkles,
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, label: 'Welcome', icon: User },
  { num: 2, label: 'Workspace', icon: Building2 },
  { num: 3, label: 'Team', icon: Users },
  { num: 4, label: 'Preferences', icon: Settings2 },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isFinishing, setIsFinishing] = useState(false);

  const [workspace, setWorkspace] = useState({
    companyName: '',
    industry: '',
    claimsVolume: '',
    primaryCarriers: '',
  });

  const [invites, setInvites] = useState<string[]>(['']);

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    dailyDigest: true,
    aiAutoProcess: true,
    complianceAlerts: true,
  });

  function addInvite() {
    setInvites((prev) => [...prev, '']);
  }

  function removeInvite(idx: number) {
    setInvites((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateInvite(idx: number, value: string) {
    setInvites((prev) => prev.map((v, i) => (i === idx ? value : v)));
  }

  async function finishOnboarding() {
    setIsFinishing(true);
    try {
      const validInvites = invites.filter((e) => e.trim().includes('@'));
      await post('/users/onboarding', {
        workspace,
        invites: validInvites,
        preferences,
      });
      toast.success('Workspace is ready! Welcome to FreightClaims.');
      router.push('/claims');
    } catch {
      toast.success('Welcome to FreightClaims!');
      router.push('/claims');
    } finally {
      setIsFinishing(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step > s.num
                    ? 'bg-emerald-500 text-white'
                    : step === s.num
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  step >= s.num ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'
                }`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 mt-[-20px] rounded ${
                  step > s.num ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-8 sm:p-10">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome to FreightClaims{user?.firstName ? `, ${user.firstName}` : ''}!
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                  Let&apos;s get your workspace set up. This takes about 2 minutes and you can always
                  change these settings later.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Here&apos;s what we&apos;ll set up:</h3>
                {[
                  { icon: Building2, text: 'Configure your company workspace' },
                  { icon: Users, text: 'Invite your team members' },
                  { icon: Settings2, text: 'Set notification and AI preferences' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                      <item.icon className="w-4 h-4 text-primary-500" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-semibold transition-colors shadow-md shadow-primary-500/20"
              >
                Let&apos;s get started
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => router.push('/claims')}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Skip for now — I&apos;ll set up later
              </button>
            </div>
          )}

          {/* Step 2: Workspace */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Set up your workspace</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  This information helps us tailor the platform for your team.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ob-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Company name
                  </label>
                  <input
                    id="ob-company"
                    type="text"
                    value={workspace.companyName}
                    onChange={(e) => setWorkspace((p) => ({ ...p, companyName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <label htmlFor="ob-industry" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Industry
                  </label>
                  <select
                    id="ob-industry"
                    value={workspace.industry}
                    onChange={(e) => setWorkspace((p) => ({ ...p, industry: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700"
                  >
                    <option value="">Select your industry</option>
                    <option value="3pl">Third-Party Logistics (3PL)</option>
                    <option value="freight_broker">Freight Brokerage</option>
                    <option value="shipper">Shipper / Manufacturer</option>
                    <option value="carrier">Carrier / Trucking Company</option>
                    <option value="insurance">Insurance / Underwriting</option>
                    <option value="legal">Legal / Law Firm</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ob-volume" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Monthly claims volume
                  </label>
                  <select
                    id="ob-volume"
                    value={workspace.claimsVolume}
                    onChange={(e) => setWorkspace((p) => ({ ...p, claimsVolume: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700"
                  >
                    <option value="">How many claims per month?</option>
                    <option value="1-25">1–25 claims</option>
                    <option value="26-100">26–100 claims</option>
                    <option value="101-500">101–500 claims</option>
                    <option value="500+">500+ claims</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ob-carriers" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary carriers <span className="text-slate-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    id="ob-carriers"
                    type="text"
                    value={workspace.primaryCarriers}
                    onChange={(e) => setWorkspace((p) => ({ ...p, primaryCarriers: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                    placeholder="FedEx, UPS, XPO, etc."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-primary-500/20"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Invite Team */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invite your team</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Claims management works best as a team. Add colleagues now or invite them later from Settings.
                </p>
              </div>

              <div className="space-y-3">
                {invites.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateInvite(idx, e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                        placeholder="colleague@company.com"
                      />
                    </div>
                    {invites.length > 1 && (
                      <button
                        onClick={() => removeInvite(idx)}
                        className="w-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addInvite}
                className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                <Plus className="w-4 h-4" /> Add another
              </button>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">Tip:</strong> Invited users will receive
                an email with a link to create their account. You can manage roles and permissions after they join.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-primary-500/20"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Skip — I&apos;ll invite people later
              </button>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Set your preferences</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Configure how FreightClaims works for you. Everything can be changed later in Settings.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Notifications</h3>
                {[
                  { key: 'emailNotifications', icon: Mail, label: 'Email notifications', desc: 'Claim updates, deadline alerts, and AI actions' },
                  { key: 'complianceAlerts', icon: Shield, label: 'Compliance alerts', desc: 'Carmack deadline warnings and carrier response tracking' },
                  { key: 'dailyDigest', icon: FileText, label: 'Daily digest', desc: 'Summary of claims activity, settlements, and AI performance' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences[item.key as keyof typeof preferences]}
                      onChange={(e) => setPreferences((p) => ({ ...p, [item.key]: e.target.checked }))}
                      className="mt-1 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">AI Settings</h3>
                <label
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-4 h-4 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">AI auto-processing</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Allow AI agents to automatically process intake, check documents, and send
                      follow-ups. Critical actions still require human approval.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.aiAutoProcess}
                    onChange={(e) => setPreferences((p) => ({ ...p, aiAutoProcess: e.target.checked }))}
                    className="mt-1 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
                  />
                </label>

                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg p-3 flex items-start gap-2.5 mt-2">
                  <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Note:</strong> AI agents will never send emails to carriers, accept settlements, or
                    take legal action without explicit human approval — even with auto-processing enabled.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={finishOnboarding}
                  disabled={isFinishing}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-md shadow-emerald-500/20"
                >
                  {isFinishing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isFinishing ? 'Setting up...' : 'Launch my workspace'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help link at the bottom */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Having trouble? <a href="/help" className="text-primary-500 hover:underline">Get help</a> or
          email <a href="mailto:support@freightclaims.com" className="text-primary-500 hover:underline">support@freightclaims.com</a>
        </p>
      </div>
    </div>
  );
}
