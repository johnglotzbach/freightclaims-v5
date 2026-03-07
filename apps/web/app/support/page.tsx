/**
 * Support / Help Center — Public support resources page
 *
 * Provides multiple support channels, knowledge base categories,
 * quick links, and a prominent contact CTA. Accessible without auth.
 *
 * Location: apps/web/app/support/page.tsx
 */
import Link from 'next/link';
import {
  Truck, MessageSquare, Mail, Phone, Book, FileText, Shield,
  Brain, Users, Settings, BarChart3, Clock, ArrowRight,
  Headphones, Search, ExternalLink, HelpCircle, Zap, Globe,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';

export const metadata = {
  title: 'Support & Help Center',
  description: 'Get help with FreightClaims. Browse guides, FAQs, and contact our support team.',
};

const KB_CATEGORIES = [
  {
    icon: Zap,
    title: 'Getting Started',
    description: 'Account setup, onboarding, and first-claim walkthroughs',
    articles: ['Creating your account', 'Onboarding wizard guide', 'Filing your first claim', 'Inviting team members', 'Importing existing claims via CSV'],
  },
  {
    icon: FileText,
    title: 'Claims Management',
    description: 'Filing, tracking, updating, and resolving claims',
    articles: ['Claim lifecycle overview', 'Uploading documents', 'Tracking claim status', 'Settlement workflows', 'Mass upload and bulk operations'],
  },
  {
    icon: Brain,
    title: 'AI Agents',
    description: 'Understanding and configuring the AI agent system',
    articles: ['AI agent overview', 'Claim Intake Agent', 'Compliance monitoring', 'Negotiation agent setup', 'AI Copilot usage guide'],
  },
  {
    icon: Shield,
    title: 'Carmack Compliance',
    description: 'Deadlines, requirements, and regulatory guidance',
    articles: ['Carmack Amendment overview', 'Deadline tracking explained', 'Compliance alert configuration', 'Legal escalation workflows'],
  },
  {
    icon: Users,
    title: 'Users & Permissions',
    description: 'Roles, access control, and team management',
    articles: ['Role-based access control', 'Creating custom roles', 'Permission levels explained', 'Managing team members', 'Multi-tenant setup'],
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Dashboards, exports, and data visualization',
    articles: ['Dashboard overview', 'Custom reports', 'Exporting claim data', 'Carrier scorecards', 'Settlement analytics'],
  },
  {
    icon: Settings,
    title: 'Account & Settings',
    description: 'Profile, billing, notifications, and workspace config',
    articles: ['Notification preferences', 'Company settings', 'Billing and plans', 'Two-factor authentication', 'API key management'],
  },
  {
    icon: Globe,
    title: 'Integrations & API',
    description: 'API documentation, webhooks, and third-party connections',
    articles: ['REST API quickstart', 'Authentication & tokens', 'Webhook configuration', 'Carrier portal integrations', 'Email forwarding setup'],
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center mx-auto mb-5">
            <HelpCircle className="w-7 h-7 text-primary-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How can we help?
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 max-w-lg mx-auto">
            Browse our knowledge base, read guides, or reach out directly — we&apos;re here for you.
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search guides, articles, and FAQs..."
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-card"
            />
          </div>
        </div>
      </section>

      {/* Contact channels */}
      <section className="py-12 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: MessageSquare,
                title: 'Live Chat',
                description: 'Chat with our team in real-time',
                detail: 'Mon–Fri, 8am–6pm ET',
                color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
              },
              {
                icon: Mail,
                title: 'Email Support',
                description: 'support@freightclaims.com',
                detail: 'Same-day response guaranteed',
                color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
                iconBg: 'bg-blue-100 dark:bg-blue-500/20',
              },
              {
                icon: Phone,
                title: 'Phone Support',
                description: '1-800-555-0199',
                detail: 'Enterprise & urgent issues',
                color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
                iconBg: 'bg-violet-100 dark:bg-violet-500/20',
              },
              {
                icon: Brain,
                title: 'AI Copilot',
                description: 'Ask the AI inside the app',
                detail: 'Available 24/7 in your dashboard',
                color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                iconBg: 'bg-amber-100 dark:bg-amber-500/20',
              },
            ].map((ch) => (
              <div key={ch.title} className={`${ch.color} rounded-xl p-5`}>
                <div className={`w-10 h-10 rounded-lg ${ch.iconBg} flex items-center justify-center mb-3`}>
                  <ch.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm">{ch.title}</h3>
                <p className="text-xs mt-1 opacity-80">{ch.description}</p>
                <p className="text-[11px] mt-1 opacity-60">{ch.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge Base */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Knowledge Base</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Browse by category or search for specific topics</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {KB_CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="group p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-200 dark:hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-3 group-hover:bg-primary-100 dark:group-hover:bg-primary-500/20 transition-colors">
                  <cat.icon className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{cat.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{cat.description}</p>
                <ul className="space-y-1.5">
                  {cat.articles.map((article) => (
                    <li key={article}>
                      <Link href="/help" className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors flex items-center gap-1">
                        <Book className="w-3 h-3 flex-shrink-0" />
                        {article}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* In-app help center banner */}
      <section className="py-8 bg-primary-50 dark:bg-primary-500/5 border-y border-primary-100 dark:border-primary-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-primary-900 dark:text-primary-100">Looking for in-depth guides?</h3>
            <p className="text-xs text-primary-700 dark:text-primary-300 mt-0.5">Our full Help Center with step-by-step tutorials is available inside the app.</p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-primary-500/20 flex-shrink-0">
            Log in to Help Center <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Popular topics */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Popular Topics</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { q: 'How do I file my first claim?', cat: 'getting-started' },
              { q: 'What are the Carmack Amendment deadlines?', cat: 'claims-management' },
              { q: 'How does the AI intake agent work?', cat: 'ai-features' },
              { q: 'Can I import claims from a spreadsheet?', cat: 'getting-started' },
              { q: 'How do I set up user permissions?', cat: 'account-settings' },
              { q: 'How do I configure email notifications?', cat: 'account-settings' },
              { q: 'What does the Negotiation Agent do?', cat: 'ai-features' },
              { q: 'How is my data kept secure?', cat: 'account-settings' },
              { q: 'How do I use the AI Copilot chat?', cat: 'ai-features' },
            ].map((topic) => (
              <Link
                key={topic.q}
                href="/help"
                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-500/30 transition-colors group"
              >
                <Book className="w-4 h-4 text-slate-400 group-hover:text-primary-500 flex-shrink-0 transition-colors" />
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {topic.q}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-400 ml-auto flex-shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Status + Contact CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* System status */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All systems operational</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
            <span className="text-xs text-slate-400">Last checked: just now</span>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-10 text-white">
            <Headphones className="w-10 h-10 text-primary-200 mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold mb-2">Still need help?</h2>
            <p className="text-primary-100 mb-6 max-w-md mx-auto">
              Our support team is ready to help you succeed. Reach out anytime — no question is too small.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-primary-50 px-6 py-2.5 rounded-lg font-bold text-sm transition-colors"
              >
                Contact Us
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:support@freightclaims.com"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-800 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-primary-400"
              >
                <Mail className="w-4 h-4" />
                Email Support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-400" />
            <span>&copy; 2026 FreightClaims.com</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
