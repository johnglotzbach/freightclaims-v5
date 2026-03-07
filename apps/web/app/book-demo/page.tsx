/**
 * Book a Demo Page — Demo scheduling form
 *
 * Public page for prospective customers to request a demo.
 * Collects company info, preferred date/time, and requirements.
 *
 * Location: apps/web/app/book-demo/page.tsx
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { post } from '@/lib/api-client';
import {
  Truck, CalendarDays, CheckCircle2, ArrowRight, Send, Users,
  Brain, Shield, BarChart3, Clock, Headphones,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';

export default function BookDemoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    company: '', jobTitle: '', companySize: '', claimsVolume: '',
    preferredDate: '', preferredTime: '', message: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await post('/contact/demo', form);
      setSent(true);
      toast.success('Demo request submitted! We\'ll be in touch shortly.');
    } catch {
      toast.error('Something went wrong. Please try again or email us at support@freightclaims.com.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left — info */}
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 bg-accent-50 dark:bg-accent-500/10 rounded-full px-4 py-1.5 mb-5 border border-accent-100 dark:border-accent-500/20">
              <CalendarDays className="w-4 h-4 text-accent-500" />
              <span className="text-accent-700 dark:text-accent-300 text-sm font-medium">Free Demo</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              See FreightClaims in action
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              Schedule a personalized demo with our team. We&apos;ll walk you through the platform,
              show you how AI agents work with your specific claim types, and answer every question.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: Brain, text: 'See AI agents process a claim live' },
                { icon: BarChart3, text: 'Explore the analytics dashboard with sample data' },
                { icon: Shield, text: 'Learn how multi-tenant security protects your data' },
                { icon: Users, text: 'Understand role-based permissions and workflows' },
                { icon: Clock, text: '30-minute demo, tailored to your needs' },
                { icon: Headphones, text: 'Ask anything — no sales pressure' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-primary-500" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <div className="card p-8 sm:p-10">
              {!sent ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Request your demo</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Fill out the form and we&apos;ll get back to you within 1 business day.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <InputField id="demo-fn" label="First name *" value={form.firstName} onChange={(v) => update('firstName', v)} placeholder="John" required />
                      <InputField id="demo-ln" label="Last name *" value={form.lastName} onChange={(v) => update('lastName', v)} placeholder="Doe" required />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <InputField id="demo-email" label="Work email *" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="john@company.com" required />
                      <InputField id="demo-phone" label="Phone" type="tel" value={form.phone} onChange={(v) => update('phone', v)} placeholder="+1 (555) 000-0000" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <InputField id="demo-company" label="Company name *" value={form.company} onChange={(v) => update('company', v)} placeholder="Acme Logistics" required />
                      <SelectField id="demo-title" label="Your role" value={form.jobTitle} onChange={(v) => update('jobTitle', v)} options={['', 'Claims Manager / Director', 'Claims Handler / Analyst', 'Operations Manager', 'Logistics Coordinator', 'Executive / Owner', 'IT / Developer', 'Other']} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <SelectField id="demo-size" label="Company size" value={form.companySize} onChange={(v) => update('companySize', v)} options={['', '1–10 employees', '11–50', '51–200', '201–500', '500+']} />
                      <SelectField id="demo-volume" label="Monthly claims volume" value={form.claimsVolume} onChange={(v) => update('claimsVolume', v)} options={['', '1–25 claims', '26–100', '101–500', '500+']} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <InputField id="demo-date" label="Preferred date" type="date" value={form.preferredDate} onChange={(v) => update('preferredDate', v)} />
                      <SelectField id="demo-time" label="Preferred time (ET)" value={form.preferredTime} onChange={(v) => update('preferredTime', v)} options={['', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']} />
                    </div>
                    <div>
                      <label htmlFor="demo-msg" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Anything specific you&apos;d like to see?</label>
                      <textarea id="demo-msg" value={form.message} onChange={(e) => update('message', e.target.value)} rows={3} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm resize-none" placeholder="E.g., AI email intake, carrier negotiation, Carmack compliance..." />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 shadow-md shadow-accent-500/20">
                      {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                      {isLoading ? 'Submitting...' : 'Request Demo'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Demo request received!</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Our team will reach out to <strong className="text-slate-700 dark:text-slate-200">{form.email}</strong> within 1 business day to confirm your demo.</p>
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

function InputField({ id, label, type = 'text', value, onChange, placeholder, required = false }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm" />
    </div>
  );
}

function SelectField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700">
        {options.map((opt) => <option key={opt} value={opt}>{opt || 'Select...'}</option>)}
      </select>
    </div>
  );
}
