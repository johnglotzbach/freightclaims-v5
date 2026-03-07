/**
 * Features / Our Software Page — Detailed feature breakdown
 *
 * Comprehensive showcase of all platform capabilities, matching
 * the old site's "Our Software" and "View More Features" links.
 *
 * Location: apps/web/app/features/page.tsx
 */
import Link from 'next/link';
import {
  Truck, ArrowRight, FileText, Brain, Shield, BarChart3,
  Users, Globe, MessageSquare, Lock, Clock, Mail, Search,
  Workflow, Camera, CheckCircle2, Banknote, Handshake,
  MonitorSmartphone, Zap, Sparkles, CalendarDays,
  AlertTriangle, TrendingUp, PieChart, FolderOpen, Bell,
} from 'lucide-react';

export const metadata = {
  title: 'Features — Our Software',
  description: 'Explore every feature of FreightClaims.com — AI agents, Carmack compliance, analytics, multi-tenant security, and more.',
};

const FEATURE_SECTIONS = [
  {
    id: 'claims-management',
    title: 'Claims Management',
    subtitle: 'Complete lifecycle management from filing to settlement',
    features: [
      { icon: FileText, title: 'File Claims in Minutes', description: 'Streamlined intake forms with auto-populated carrier data, commodity templates, and document upload.' },
      { icon: Search, title: 'Universal Search', description: 'Search across all claims, carriers, customers, and documents from a single search bar.' },
      { icon: Workflow, title: 'Status Workflows', description: 'Customizable claim statuses with automatic transitions, notifications, and escalation rules.' },
      { icon: FolderOpen, title: 'Document Management', description: 'Upload BOLs, invoices, photos, and inspection reports. AI checks completeness and flags missing items.' },
      { icon: Bell, title: 'Automated Notifications', description: 'Email alerts for status changes, deadline warnings, carrier responses, and settlement updates.' },
      { icon: CalendarDays, title: 'Task Management', description: 'Assign tasks, set deadlines, and track follow-ups. Never let a claim action slip through the cracks.' },
    ],
  },
  {
    id: 'ai-automation',
    title: 'AI-Powered Automation',
    subtitle: 'Seven specialized agents that handle the heavy lifting',
    features: [
      { icon: Mail, title: 'AI Email Intake', description: 'Forward claim emails to your intake address. AI extracts structured data from BOLs, invoices, and photos automatically.' },
      { icon: Camera, title: 'OCR Document Processing', description: 'Advanced optical character recognition scans documents with pinpoint accuracy and extracts key fields.' },
      { icon: Shield, title: 'Carmack Compliance Agent', description: 'Monitors 30-day ack, 120-day disposition, 9-month filing, and 2yr+1day lawsuit deadlines for every claim.' },
      { icon: Handshake, title: 'Negotiation Agent', description: 'Analyzes carrier denial letters, identifies defense strategies, and generates legally-grounded rebuttals.' },
      { icon: TrendingUp, title: 'Valuation Agent', description: 'Predicts settlement ranges using historical data, carrier behavior, and claim characteristics.' },
      { icon: Clock, title: 'Follow-Up Agent', description: 'Monitors stale claims and automatically escalates: follow-up → demand → insurance → litigation.' },
      { icon: MessageSquare, title: 'Customer Copilot', description: 'Floating AI chat on every page. Ask questions about any claim and get instant, accurate answers.' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Reporting',
    subtitle: 'Real-time dashboards and actionable insights',
    features: [
      { icon: BarChart3, title: 'Interactive Dashboard', description: 'KPI cards, trend charts, status breakdowns, and Carmack compliance alerts — all in real time.' },
      { icon: PieChart, title: 'Claims by Type & Status', description: 'Donut charts, bar charts, and area charts that break down your claims any way you need.' },
      { icon: TrendingUp, title: 'Carrier Scorecards', description: 'Rank carriers by denial rate, settlement speed, average payout, and response time.' },
      { icon: Banknote, title: 'Settlement Intelligence', description: 'AI-powered predictions of expected settlement amounts based on historical patterns.' },
    ],
  },
  {
    id: 'security',
    title: 'Security & Multi-Tenancy',
    subtitle: 'Enterprise-grade protection for your most sensitive data',
    features: [
      { icon: Lock, title: 'Multi-Tenant Isolation', description: 'Every query is automatically filtered by CorporateId. Tenant A can never see Tenant B\'s data.' },
      { icon: Users, title: '26 Granular Permissions', description: 'View and edit levels across 8 modules. Create custom roles scoped to each organization.' },
      { icon: Shield, title: 'Full Audit Trail', description: 'Every create, update, and delete is logged with user ID, IP address, timestamp, and entity details.' },
      { icon: AlertTriangle, title: 'Rate Limiting', description: '100 requests per 15 minutes for general use, 10 for login attempts. Prevents brute-force attacks.' },
    ],
  },
  {
    id: 'platform',
    title: 'Platform & Experience',
    subtitle: 'Built for modern teams on any device',
    features: [
      { icon: MonitorSmartphone, title: 'Fully Responsive', description: 'Works beautifully on desktop, tablet, and phone. Touch-optimized with 44px minimum tap targets.' },
      { icon: Globe, title: 'Dark Mode', description: 'System-wide dark mode support. Follows your system preference or toggle manually.' },
      { icon: Zap, title: 'Sub-Second Performance', description: 'Two-tier caching (in-memory + Redis), connection pooling, and SSR for instant page loads.' },
      { icon: Sparkles, title: 'Guided Onboarding', description: '4-step onboarding wizard: company setup, team invites, carrier config, and AI preferences.' },
    ],
  },
];

export default function FeaturesPage() {
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

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Our <span className="text-accent-500">Software</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            Everything you need to file, track, negotiate, and settle freight claims — powered by AI,
            protected by enterprise-grade security, and designed for claims professionals.
          </p>

          {/* Quick nav */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {FEATURE_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-500/30 hover:text-primary-500 transition-colors"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      {FEATURE_SECTIONS.map((section, idx) => (
        <section
          key={section.id}
          id={section.id}
          className={`py-20 sm:py-24 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-900/50'}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{section.title}</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">{section.subtitle}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.features.map((f) => (
                <div key={f.title} className="group p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-200 dark:hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-4 group-hover:bg-primary-100 dark:group-hover:bg-primary-500/20 transition-colors">
                    <f.icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">See all features in action</h2>
          <p className="text-accent-100 text-lg mb-8">Book a personalized demo or start your 14-day free trial today.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/book-demo" className="inline-flex items-center gap-2 bg-white text-accent-600 hover:bg-accent-50 px-8 py-3.5 rounded-xl font-bold transition-colors">Book a Demo <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/register" className="inline-flex items-center gap-2 bg-accent-700 hover:bg-accent-800 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors border border-accent-400">Start Free Trial</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary-400" /><span>&copy; 2026 FreightClaims.com</span></div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/news" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
