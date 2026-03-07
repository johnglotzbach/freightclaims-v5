/**
 * Contact Page — Public contact form and support information
 *
 * Provides a contact form alongside direct support channels.
 * Accessible without authentication.
 *
 * Location: apps/web/app/contact/page.tsx
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { post } from '@/lib/api-client';
import {
  Truck, Mail, Phone, MapPin, Clock, Send, CheckCircle2,
  MessageSquare, Headphones, ArrowRight, Building2,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    type: 'general',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await post('/contact', form);
      setSent(true);
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
    } catch {
      toast.error('Something went wrong. Please try again or email us at support@freightclaims.com.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left column — Info */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Get in touch
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Have a question, need a demo, or want to discuss how FreightClaims can work for your team?
              We&apos;d love to hear from you.
            </p>

            <div className="mt-10 space-y-6">
              {[
                { icon: Mail, label: 'Email', value: 'support@freightclaims.com', href: 'mailto:support@freightclaims.com' },
                { icon: Phone, label: 'Phone', value: '1-800-555-0199', href: 'tel:+18005550199' },
                { icon: Clock, label: 'Hours', value: 'Mon–Fri, 8am–6pm ET', href: null },
                { icon: MapPin, label: 'Office', value: 'Miami, FL — United States', href: null },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{item.label}</div>
                    {item.href ? (
                      <a href={item.href} className="text-sm font-medium text-slate-900 dark:text-white hover:text-primary-500 transition-colors">
                        {item.value}
                      </a>
                    ) : (
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{item.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="mt-10 p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Quick links</h3>
              <div className="space-y-2">
                {[
                  { icon: Headphones, text: 'Help Center & Knowledge Base', href: '/support' },
                  { icon: MessageSquare, text: 'Schedule a Demo', href: '/register' },
                  { icon: Building2, text: 'Enterprise & Custom Plans', href: '/contact' },
                ].map((link) => (
                  <Link
                    key={link.text}
                    href={link.href}
                    className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 transition-colors group"
                  >
                    <link.icon className="w-4 h-4 flex-shrink-0" />
                    {link.text}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Form */}
          <div className="lg:col-span-3">
            <div className="card p-8 sm:p-10">
              {!sent ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Send us a message</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Fill out the form below and we&apos;ll get back to you within 24 hours.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ct-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Full name *
                        </label>
                        <input
                          id="ct-name"
                          type="text"
                          value={form.name}
                          onChange={(e) => update('name', e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="ct-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Email address *
                        </label>
                        <input
                          id="ct-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => update('email', e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                          placeholder="john@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ct-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Company
                        </label>
                        <input
                          id="ct-company"
                          type="text"
                          value={form.company}
                          onChange={(e) => update('company', e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <label htmlFor="ct-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Inquiry type
                        </label>
                        <select
                          id="ct-type"
                          value={form.type}
                          onChange={(e) => update('type', e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700"
                        >
                          <option value="general">General Question</option>
                          <option value="demo">Request a Demo</option>
                          <option value="support">Technical Support</option>
                          <option value="sales">Sales / Pricing</option>
                          <option value="enterprise">Enterprise Plan</option>
                          <option value="partnership">Partnership</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="ct-subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Subject *
                      </label>
                      <input
                        id="ct-subject"
                        type="text"
                        value={form.subject}
                        onChange={(e) => update('subject', e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm"
                        placeholder="What can we help with?"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="ct-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Message *
                      </label>
                      <textarea
                        id="ct-message"
                        value={form.message}
                        onChange={(e) => update('message', e.target.value)}
                        rows={5}
                        className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-sm resize-none"
                        placeholder="Tell us more about your needs..."
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {isLoading ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Message sent!</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                    Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                  </p>
                  <p className="text-slate-400 text-xs mb-8">
                    For urgent matters, call us at <strong className="text-slate-600 dark:text-slate-300">1-800-555-0199</strong>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => { setSent(false); setForm({ name: '', email: '', company: '', subject: '', message: '', type: 'general' }); }}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Send another message
                    </button>
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-md shadow-primary-500/20"
                    >
                      Back to Home
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Response time */}
            {!sent && (
              <div className="flex items-center gap-2 justify-center mt-4 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                Average response time: under 4 hours during business hours
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-400" />
            <span>&copy; 2026 FreightClaims.com</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
