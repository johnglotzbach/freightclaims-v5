/**
 * Landing Page — Public homepage for freightclaims.com
 *
 * Full marketing page matching the original site's flow plus v5.0 additions:
 * Navbar, Hero, Pain Points, Services, How It Works, Analytics/Dashboard,
 * AI Email Claim Entry, AI Agents, Partnerships, Stats,
 * Testimonials, FAQ, CTA Banner, Footer.
 *
 * Location: apps/web/app/page.tsx
 */
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/public-navbar';
import {
  Truck, Shield, Brain, BarChart3, Clock, MessageSquare,
  CheckCircle2, ArrowRight, ChevronDown, Zap, Lock,
  FileText, TrendingUp, Users, Headphones, Mail, Phone,
  Globe, Star, Award, Target, XCircle, AlertTriangle,
  FileX, Ban, Crosshair, Camera,
  CalendarDays, MonitorSmartphone, PieChart, Workflow,
  Banknote, Search, Handshake, ChevronRight, Sparkles,
  ExternalLink, BookOpen, Cog,
} from 'lucide-react';

export const metadata = {
  title: 'FreightClaims.com — AI-Powered Freight Claims Management',
  description: 'The #1 trusted platform for supply chain claims. File, track, negotiate, and settle freight claims faster with AI-powered automation. Freight Claims Simplified.',
  openGraph: {
    title: 'FreightClaims.com — AI-Powered Freight Claims Management',
    description: 'File, track, negotiate, and settle freight claims faster with AI-powered automation.',
    url: 'https://freightclaims.com',
    siteName: 'FreightClaims.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreightClaims.com — Freight Claims Simplified',
    description: 'The #1 trusted platform for supply chain claims management.',
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />
      <Hero />
      <TrustBar />
      <PainPoints />
      <Services />
      <HowItWorks />
      <AnalyticsDashboard />
      <AIEmailClaimEntry />
      <AIAgents />
      <Partnerships />
      <Stats />
      <Testimonials />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyNTYzZWIiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-500/10 rounded-full px-4 py-1.5 mb-6 border border-primary-100 dark:border-primary-500/20">
              <Zap className="w-4 h-4 text-primary-500" />
              <span className="text-primary-700 dark:text-primary-300 text-sm font-medium">
                Version 5.0 — Now with AI-Powered Agents
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-6">
              Freight Claims,{' '}
              <span className="bg-gradient-to-r from-accent-500 to-accent-600 bg-clip-text text-transparent">
                Simplified.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-lg">
              The industry&apos;s leading claims management platform. File, track,
              negotiate, and settle freight claims with AI-powered automation
              — everything you need and nothing you don&apos;t.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-accent-500/25 hover:shadow-xl text-base"
              >
                Book a Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-8 py-3.5 rounded-xl font-semibold transition-all border border-slate-200 dark:border-slate-700 text-base"
              >
                Get Started Free
              </Link>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                14-day free trial
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                No credit card required
              </span>
            </div>
          </div>

          {/* Dashboard preview card */}
          <div className="hidden lg:block relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/80 border border-slate-200 dark:border-slate-700 p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400 ml-2 font-mono">freightclaims.com/claims</span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Active Claims', value: '1,247', color: 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300' },
                    { label: 'Pending Review', value: '89', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300' },
                    { label: 'Settlement Rate', value: '94.2%', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
                    { label: 'Avg. Recovery', value: '$4,831', color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300' },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
                      <div className="text-[10px] font-medium opacity-80">{s.label}</div>
                      <div className="text-lg font-bold mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="h-32 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-end justify-center gap-1.5 p-3">
                  {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 92].map((h, i) => (
                    <div
                      key={i}
                      className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    AI Agent processed 23 claims automatically today
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Trust Bar                                                          */
/* ------------------------------------------------------------------ */
function TrustBar() {
  return (
    <section className="border-y border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
          Trusted by logistics companies across North America
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-50">
          {['XPO Logistics', 'Echo Global', 'C.H. Robinson', 'TQL', 'Coyote Logistics', 'JB Hunt'].map((name) => (
            <span key={name} className="text-lg font-bold text-slate-400 dark:text-slate-600 tracking-tight">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pain Points — "Mismanaged Claims Cost More Than You Realize"       */
/* ------------------------------------------------------------------ */
function PainPoints() {
  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Mismanaged Claims Come With{' '}
              <span className="text-accent-500">More Costs</span>{' '}
              Than You Realize
            </h2>

            <p className="text-slate-600 dark:text-slate-400 mt-5 leading-relaxed">
              As a result of insufficient visibility and reliance on manual claim processing,
              cargo losses exceed <strong className="text-slate-900 dark:text-white">$50 billion annually</strong>.
              Every shipper, broker, and third-party logistic provider experiences freight claims.
              Freight claims can be over-complicated and extremely frustrating. Carrier communication
              causes confusion and seems to only delay settlement.
            </p>

            <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm">
              Problems that every company experiences with shipping and receiving freight:
            </p>

            <div className="grid grid-cols-2 gap-4 mt-6">
              {[
                { icon: Clock, text: 'Missed Claims Deadlines' },
                { icon: FileX, text: 'Lost Claims Documentation' },
                { icon: Ban, text: 'Denied Claims' },
                { icon: AlertTriangle, text: 'Mismanaged Claims' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual — claim declining chart mockup */}
          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Mismanaged Claims</h3>
              <div className="h-40 flex items-end gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                {[75, 82, 68, 90, 55, 72, 45, 38, 52, 30, 25, 20].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${i < 6 ? 'bg-red-400/80' : 'bg-emerald-400/80'}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400">
                <span>Before FreightClaims</span>
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <TrendingUp className="w-3 h-3" /> After FreightClaims
                </span>
              </div>
            </div>
            {/* Decorative dots */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 grid grid-cols-5 gap-1.5 opacity-20">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Services — "Our Freight Claims Services Help You Win"              */
/* ------------------------------------------------------------------ */
function Services() {
  const services = [
    {
      icon: Crosshair,
      title: 'Opening And Tracking Freight Claims',
      description: 'File claims in minutes with our streamlined intake process. Track every claim from filing through settlement with real-time status updates.',
    },
    {
      icon: Camera,
      title: 'Supporting With Details, Photos And Documentation',
      description: 'Upload documents, damage photos, BOLs, invoices, and inspection reports. Our AI checks completeness and flags missing items automatically.',
    },
    {
      icon: Handshake,
      title: 'Negotiating Timely Claim Settlements',
      description: 'Our AI-powered negotiation agent analyzes carrier denials and generates legally-grounded rebuttals to accelerate settlements.',
    },
    {
      icon: Banknote,
      title: 'Collecting Payments From Carriers',
      description: 'Track payment commitments, monitor settlement timelines, and escalate unpaid claims through automated follow-up workflows.',
    },
  ];

  return (
    <section id="services" className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Our Freight Claims{' '}
            <span className="text-accent-500">Services</span>{' '}
            Help You Win
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <div
              key={s.title}
              className="group text-center p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-500/30 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary-100 dark:group-hover:bg-primary-500/20 transition-colors">
                <s.icon className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 leading-snug">{s.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works — Book Demo → Get Login → Manage Claims               */
/* ------------------------------------------------------------------ */
function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Request A Demo',
      description: 'We\'ll show you the tremendous benefits of using FreightClaims.com and tailor the platform to your specific needs.',
      cta: { label: 'Book a Demo', href: '/book-demo' },
    },
    {
      number: '2',
      title: 'Receive Your Login',
      description: 'Get your FreightClaims.com account set up and enter your claims. Our onboarding wizard walks you through every step.',
      cta: null,
    },
    {
      number: '3',
      title: 'Manage Your Claims',
      description: 'Leverage our software or outsource your claim handling to us. AI agents and real-time dashboards do the heavy lifting.',
      cta: null,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-primary-500 uppercase tracking-wider">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
            Get started in three simple steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative text-center group">
              {/* Step number */}
              <div className="w-14 h-14 rounded-full bg-accent-500 text-white text-xl font-extrabold flex items-center justify-center mx-auto mb-5 shadow-lg shadow-accent-500/30 group-hover:scale-110 transition-transform">
                {step.number}
              </div>
              {/* Connector line */}
              {Number(step.number) < 3 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-slate-200 dark:bg-slate-700" />
              )}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">{step.description}</p>
              {step.cta && (
                <Link
                  href={step.cta.href}
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-accent-500 hover:text-accent-600 transition-colors"
                >
                  {step.cta.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/book-demo"
            className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-accent-500/20 text-sm"
          >
            Book a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Analytics & Dashboard                                              */
/* ------------------------------------------------------------------ */
function AnalyticsDashboard() {
  return (
    <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Visual — multi-device dashboard */}
          <div className="relative order-2 lg:order-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-5 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-primary-50 dark:bg-primary-500/10 rounded-lg p-3">
                  <div className="text-[10px] text-primary-600 dark:text-primary-300 font-medium">Claims Filed</div>
                  <div className="text-xl font-bold text-primary-700 dark:text-primary-200">2,847</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium">Settled</div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-200">2,614</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
                  <div className="text-[10px] text-amber-600 dark:text-amber-300 font-medium">Recovery Rate</div>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-200">91.8%</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 h-28 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 flex items-end gap-1">
                  {[30, 45, 60, 50, 70, 85, 75, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary-400 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="w-28 h-28 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 flex items-center justify-center">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-600" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="97.4 97.4" strokeDashoffset="8" strokeLinecap="round" className="text-primary-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">91.8%</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Tablet overlay */}
            <div className="absolute -bottom-6 -right-6 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 transform rotate-3">
              <div className="text-[9px] font-semibold text-slate-500 mb-1">Carrier Scorecard</div>
              {['XPO — 94%', 'FedEx — 88%', 'UPS — 91%'].map((c) => (
                <div key={c} className="text-[10px] text-slate-600 dark:text-slate-300 py-0.5">{c}</div>
              ))}
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Analytics &{' '}
              <span className="text-accent-500">Dashboard</span>
            </h2>

            <p className="text-slate-600 dark:text-slate-400 mt-5 leading-relaxed">
              At FreightClaims.com, we&apos;re all about transforming data into actionable insights.
              Our advanced analytics tools empower you to turn complex freight data into clear,
              informed actions. Harness a comprehensive view of your claims, where every trend
              and pattern is unveiled to drive smarter decisions.
            </p>

            <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
              Our analytics solutions dive deep into your freight operations, offering real-time
              visibility and detailed reports that highlight key metrics and identify areas for
              improvement. With intuitive dashboards and customizable reports, you can
              effortlessly track cost savings, monitor carrier performance, and optimize your
              logistics strategies.
            </p>

            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-accent-500 hover:text-accent-600 transition-colors border border-accent-200 dark:border-accent-500/30 rounded-lg px-5 py-2.5 hover:bg-accent-50 dark:hover:bg-accent-500/5"
            >
              View More Features
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Email Claim Entry                                               */
/* ------------------------------------------------------------------ */
function AIEmailClaimEntry() {
  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              AI{' '}
              <span className="text-accent-500">Email Claim</span>{' '}
              Entry
            </h2>

            <p className="text-slate-600 dark:text-slate-400 mt-5 leading-relaxed">
              OCR (Optical Character Recognition) and AI-driven email claim entry solutions.
              Say goodbye to manual data entry and hello to seamless, efficient claims processing.
            </p>

            <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
              Our advanced OCR technology scans and extracts relevant data from your documents
              with pinpoint accuracy, while our AI algorithms intelligently categorize and input
              claim information directly from your emails. This powerful combination eliminates
              tedious manual work and reduces the risk of errors, letting you focus on more
              strategic tasks.
            </p>

            <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
              Experience the future of claims management with our automated system that processes
              and organizes your claims swiftly and accurately. With real-time updates and
              streamlined workflows, you can stay on top of your claims without breaking a sweat.
            </p>

            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-accent-500 hover:text-accent-600 transition-colors border border-accent-200 dark:border-accent-500/30 rounded-lg px-5 py-2.5 hover:bg-accent-50 dark:hover:bg-accent-500/5"
            >
              View More Features
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Visual — email-to-claim flow */}
          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
              {/* Email input */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-4">
                <Mail className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">incoming@freightclaims.com</div>
                  <div className="text-[10px] text-slate-400">Claim: Damaged shipment PRO #84721</div>
                </div>
              </div>
              {/* AI processing arrow */}
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-500 animate-pulse" />
                </div>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              {/* Extracted data */}
              <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-lg border border-emerald-100 dark:border-emerald-500/10">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Data Extracted Automatically
                </div>
                {[
                  ['Carrier', 'XPO Logistics'],
                  ['PRO #', '84721-A'],
                  ['Claim Type', 'Damage — Concealed'],
                  ['Amount', '$3,450.00'],
                  ['Shipper', 'Pacific Manufacturing Co.'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400">{label}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-4 -right-4 w-20 h-20 grid grid-cols-4 gap-1.5 opacity-20">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Agents Showcase                                                 */
/* ------------------------------------------------------------------ */
function AIAgents() {
  const agents = [
    { name: 'Claim Intake Agent', description: 'Extracts structured data from emails, BOLs, invoices, and photos.', impact: 'Saves 15-20 min/claim', color: 'from-blue-500 to-cyan-500' },
    { name: 'Documents Agent', description: 'Checks required docs vs. uploads. Drafts follow-up requests.', impact: '40% of handler work', color: 'from-violet-500 to-purple-500' },
    { name: 'Compliance Agent', description: 'Monitors all Carmack Amendment deadlines and flags violations.', impact: 'Zero missed deadlines', color: 'from-emerald-500 to-teal-500' },
    { name: 'Negotiation Agent', description: 'Analyzes denials and generates legally-grounded rebuttals.', impact: '3x faster responses', color: 'from-orange-500 to-amber-500' },
    { name: 'Valuation Agent', description: 'Predicts settlement ranges from historical data.', impact: 'Data-driven strategy', color: 'from-rose-500 to-pink-500' },
    { name: 'Follow-Up Agent', description: 'Monitors stale claims and auto-escalates through the chain.', impact: 'Runs 24/7', color: 'from-sky-500 to-indigo-500' },
  ];

  return (
    <section id="ai-agents" className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-primary-500 uppercase tracking-wider">AI Agents</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
            Six AI agents that never sleep
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">
            Each agent is specialized for a critical part of the claims lifecycle.
            They work together to handle complex multi-step workflows autonomously.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.name} className="group relative p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
              <div className="relative">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center mb-4`}>
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{agent.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{agent.description}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 rounded-full px-3 py-1">
                  <Target className="w-3 h-3" />
                  {agent.impact}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            Plus a <strong className="text-slate-700 dark:text-slate-200">Customer Copilot</strong> — a floating AI chat on every page that answers questions instantly.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Partnerships & Integrations                                        */
/* ------------------------------------------------------------------ */
function Partnerships() {
  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Visual — gears/integration graphic */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 animate-[spin_30s_linear_infinite]" />
              {/* Middle ring */}
              <div className="absolute inset-8 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 animate-[spin_20s_linear_infinite_reverse]" />
              {/* Center logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-primary-500 flex items-center justify-center shadow-xl shadow-primary-500/30">
                  <Truck className="w-10 h-10 text-white" />
                </div>
              </div>
              {/* Orbiting icons */}
              {[
                { icon: Cog, pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
                { icon: Globe, pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
                { icon: Shield, pos: 'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2' },
                { icon: BarChart3, pos: 'top-1/2 right-0 -translate-y-1/2 translate-x-1/2' },
              ].map((item, i) => (
                <div key={i} className={`absolute ${item.pos} w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center`}>
                  <item.icon className="w-5 h-5 text-primary-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Copy */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Partnerships &{' '}
              <span className="text-accent-500">Integrations</span>
            </h2>

            <p className="text-slate-600 dark:text-slate-400 mt-5 leading-relaxed">
              FreightClaims.com partners with industry-leading companies to provide shippers
              and brokers with a centralized platform for managing every aspect of the claims
              process. Schedule a demo to see how our powerful partnerships boost operations.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {['TMS Integrations', 'Carrier Portals', 'Insurance Providers', 'Inspection Services', 'Salvage Vendors', 'Legal Partners'].map((p) => (
                <div key={p} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {p}
                </div>
              ))}
            </div>

            <Link
              href="/book-demo"
              className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-accent-500 hover:text-accent-600 transition-colors border border-accent-200 dark:border-accent-500/30 rounded-lg px-5 py-2.5 hover:bg-accent-50 dark:hover:bg-accent-500/5"
            >
              View Partnerships & Integrations
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */
function Stats() {
  const stats = [
    { value: '70%', label: 'Reduction in processing time' },
    { value: '94%', label: 'Average settlement rate' },
    { value: '24hrs', label: 'Average onboarding time' },
    { value: '$0', label: 'Per-claim filing fees' },
  ];

  return (
    <section className="py-16 bg-primary-900 dark:bg-primary-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-extrabold text-white mb-2">{s.value}</div>
              <div className="text-sm text-primary-200 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
function Testimonials() {
  const reviews = [
    {
      quote: 'FreightClaims cut our average processing time from 3 weeks to 4 days. The AI compliance agent alone saved us from missing two Carmack deadlines in the first month.',
      name: 'Sarah Mitchell', role: 'Claims Director, Summit Logistics',
    },
    {
      quote: 'We switched from spreadsheets and email chains. The onboarding took less than a day, and the support team walked us through every step. Night and day difference.',
      name: 'David Chen', role: 'Operations Manager, Pacific Freight',
    },
    {
      quote: 'The carrier negotiation agent is incredible. It identified a defense pattern from a major carrier and generated rebuttals that recovered an extra $180K last quarter.',
      name: 'Maria Rodriguez', role: 'VP of Claims, Continental Transport',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
            Trusted by claims teams everywhere
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {reviews.map((r) => (
            <div key={r.name} className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <blockquote className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{r.name}</div>
                <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{r.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  { question: 'How long does it take to get started?', answer: 'Most teams are fully onboarded within 24 hours. Our setup wizard walks you through company configuration, user invites, carrier imports, and document preferences. If you have existing claims data, we can help you import it via CSV.' },
  { question: 'Do I need technical knowledge to use FreightClaims?', answer: 'Not at all. FreightClaims is designed for claims professionals, not developers. The interface is intuitive, the AI copilot can answer any question about your data, and our support team is available via live chat, email, and phone.' },
  { question: 'How does the AI work? Is it safe?', answer: 'Our AI agents use Google Gemini to process claims data. All processing happens within our secure infrastructure — your data never trains public models. AI suggestions always go through a human approval step for critical actions like sending emails or accepting settlements.' },
  { question: 'Can I import my existing claims?', answer: 'Yes. We support CSV import for bulk claims, and our AI intake agent can also process forwarded emails and documents. Our team can also assist with a custom data migration from your existing system.' },
  { question: 'What about data security and multi-tenancy?', answer: 'Every organization\'s data is completely isolated using corporate-level tenant separation. All queries are automatically filtered. We use encrypted storage, JWT authentication, role-based permissions, full audit trails, and regular security audits.' },
  { question: 'Is there a free trial?', answer: 'Yes — every new account gets a full 14-day free trial with access to all features including AI agents. No credit card required to start.' },
  { question: 'What kind of support do you offer?', answer: 'We offer live chat support during business hours, email support with same-day response, phone support for enterprise customers, a complete knowledge base, and an in-app AI copilot that can answer most questions instantly.' },
];

function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-primary-500 uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
            Common questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors list-none">
                <span className="font-semibold text-slate-900 dark:text-white text-sm pr-4">{item.question}</span>
                <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA Banner — "Streamline the way your company handles claims"      */
/* ------------------------------------------------------------------ */
function CTABanner() {
  return (
    <section className="py-6 sm:py-10 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-10 sm:p-14 lg:p-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Streamline the way your company handles claims. Get Started Today!
              </h2>
              <p className="text-accent-100 mt-4 text-lg">
                Everything you need in a claims management software and nothing you don&apos;t!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold transition-colors text-sm"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/book-demo"
                  className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors backdrop-blur text-sm border border-white/20"
                >
                  Book a Demo
                </Link>
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="hidden lg:flex justify-end">
              <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-4 w-80 transform rotate-2">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Claims', value: '1,247' },
                    { label: 'Recovery', value: '$4.2M' },
                    { label: 'Rate', value: '94.2%' },
                    { label: 'Saved', value: '340hrs' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/10 rounded-lg p-2.5">
                      <div className="text-[9px] text-white/70">{s.label}</div>
                      <div className="text-sm font-bold text-white">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="h-16 bg-white/10 rounded-lg flex items-end gap-1 p-2">
                  {[45, 60, 50, 75, 65, 85, 70, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-white/40 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">FreightClaims<span className="text-[10px] text-slate-500 font-normal">.com</span></span>
            </Link>
            <p className="text-sm leading-relaxed mb-2 max-w-xs">
              The #1 Trusted Platform for Supply Chain Claims
            </p>
            <p className="text-xs italic mb-4">Freight Claims Simplified&trade;</p>
            <div className="flex items-center gap-3 mb-3">
              <a href="https://linkedin.com/company/freightclaims" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:border-primary-500 hover:text-primary-400 transition-colors" aria-label="LinkedIn">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://instagram.com/freightclaims" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:border-primary-500 hover:text-primary-400 transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            </div>
          </div>

          {/* Our Software */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Our Software</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/book-demo" className="hover:text-white transition-colors">Book a Demo</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Free Trial</Link></li>
            </ul>
          </div>

          {/* About Us */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">About Us</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Resources</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/claim-assistance" className="hover:text-white transition-colors">Claim Assistance</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">Partnerships</Link></li>
              <li><Link href="/support" className="hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>&copy; 2026 FreightClaims.com | All Rights Reserved</span>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/support" className="hover:text-white transition-colors">Software Status</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">External End User License Agreement</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
