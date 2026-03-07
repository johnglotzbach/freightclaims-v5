/**
 * Claim Assistance Page — Public form for submitting claim help requests
 *
 * Allows prospective or existing customers to request help with freight claims
 * without needing an account. Collects shipment details and contact info.
 *
 * Location: apps/web/app/claim-assistance/page.tsx
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { post } from '@/lib/api-client';
import {
  Truck, CheckCircle2, ArrowRight, Send, FileText, Shield,
  Clock, Phone, Mail, Headphones, AlertTriangle,
} from 'lucide-react';

export default function ClaimAssistancePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    carrierName: '', proNumber: '', shipDate: '',
    claimType: '', damageDescription: '', estimatedValue: '',
    hasDocumentation: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await post('/contact/claim-assistance', form);
      setSent(true);
      toast.success('Your request has been submitted! A claims specialist will contact you.');
    } catch {
      toast.error('Something went wrong. Please try again or email us at support@freightclaims.com.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Freight<span className="text-primary-500">Claims</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/book-demo" className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-accent-500/20">Book Demo</Link>
            <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary-500">Login</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left — info */}
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-500/10 rounded-full px-4 py-1.5 mb-5 border border-primary-100 dark:border-primary-500/20">
              <Headphones className="w-4 h-4 text-primary-500" />
              <span className="text-primary-700 dark:text-primary-300 text-sm font-medium">Claim Assistance</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Need help with a freight claim?
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              Whether you&apos;re dealing with a damaged shipment, a denied claim, or just don&apos;t know
              where to start — our claims specialists are here to help. Fill out the form and we&apos;ll
              assign an expert to your case.
            </p>

            <div className="mt-8 space-y-5">
              {[
                { icon: Clock, title: 'Fast Response', description: 'A claims specialist will contact you within 4 business hours.' },
                { icon: Shield, title: 'Carmack Expertise', description: 'We know the timelines, the rules, and the carrier tactics.' },
                { icon: FileText, title: 'Full Documentation Support', description: 'We\'ll help you gather and organize every document needed.' },
                { icon: AlertTriangle, title: 'Deadline Protection', description: 'We\'ll ensure no filing deadlines are missed on your claim.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-primary-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Contact us directly</h3>
              <div className="space-y-2 text-sm">
                <a href="mailto:claims@freightclaims.com" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-500 transition-colors">
                  <Mail className="w-4 h-4" /> claims@freightclaims.com
                </a>
                <a href="tel:+18005550199" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-500 transition-colors">
                  <Phone className="w-4 h-4" /> 1-800-555-0199
                </a>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <div className="card p-8 sm:p-10">
              {!sent ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Submit your claim details</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Provide as much information as you can — we&apos;ll follow up for anything else we need.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="ca-name" label="Full name *" value={form.name} onChange={(v) => update('name', v)} placeholder="John Doe" required />
                      <Field id="ca-email" label="Email *" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="john@company.com" required />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="ca-phone" label="Phone" type="tel" value={form.phone} onChange={(v) => update('phone', v)} placeholder="+1 (555) 000-0000" />
                      <Field id="ca-company" label="Company" value={form.company} onChange={(v) => update('company', v)} placeholder="Company name" />
                    </div>

                    <hr className="border-slate-200 dark:border-slate-700" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Shipment & Claim Details</h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="ca-carrier" label="Carrier name" value={form.carrierName} onChange={(v) => update('carrierName', v)} placeholder="e.g. XPO Logistics" />
                      <Field id="ca-pro" label="PRO / Tracking number" value={form.proNumber} onChange={(v) => update('proNumber', v)} placeholder="e.g. 84721-A" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="ca-date" label="Ship date" type="date" value={form.shipDate} onChange={(v) => update('shipDate', v)} />
                      <div>
                        <label htmlFor="ca-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Claim type</label>
                        <select id="ca-type" value={form.claimType} onChange={(e) => update('claimType', e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700">
                          <option value="">Select type...</option>
                          <option value="damage">Damage (Visible)</option>
                          <option value="concealed_damage">Damage (Concealed)</option>
                          <option value="shortage">Shortage</option>
                          <option value="loss">Loss (Full / Partial)</option>
                          <option value="theft">Theft / Pilferage</option>
                          <option value="delay">Delay</option>
                          <option value="refusal">Refusal / Return</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="ca-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Describe the issue *</label>
                      <textarea id="ca-desc" value={form.damageDescription} onChange={(e) => update('damageDescription', e.target.value)} rows={4} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm resize-none" placeholder="Describe the damage, shortage, or issue..." />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="ca-value" label="Estimated claim value" value={form.estimatedValue} onChange={(v) => update('estimatedValue', v)} placeholder="e.g. $3,500" />
                      <div>
                        <label htmlFor="ca-docs" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Do you have documentation?</label>
                        <select id="ca-docs" value={form.hasDocumentation} onChange={(e) => update('hasDocumentation', e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700">
                          <option value="">Select...</option>
                          <option value="yes_complete">Yes — complete set (BOL, invoice, photos)</option>
                          <option value="yes_partial">Yes — partial</option>
                          <option value="no">No — need help gathering docs</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 shadow-md shadow-primary-500/20">
                      {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                      {isLoading ? 'Submitting...' : 'Submit Claim Request'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Request submitted!</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">A claims specialist will contact you at <strong className="text-slate-700 dark:text-slate-200">{form.email}</strong> within 4 business hours.</p>
                  <Link href="/" className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">Back to Home <ArrowRight className="w-4 h-4" /></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, type = 'text', value, onChange, placeholder, required = false }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm" />
    </div>
  );
}
