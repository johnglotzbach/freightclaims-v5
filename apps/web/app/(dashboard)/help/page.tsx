'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  HelpCircle, Search, FileText, Upload, Mail, Shield,
  Users, BarChart3, Bot, Settings, ChevronRight, ChevronDown,
  ExternalLink, MessageCircle, BookOpen,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

interface HelpCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  faqs: FaqItem[];
}

const helpCategories: HelpCategory[] = [
  {
    id: 'claims',
    title: 'Filing Claims',
    icon: FileText,
    description: 'How to create, manage, and track freight claims',
    faqs: [
      { question: 'How do I file a new claim?', answer: 'Navigate to Claims > New Claim from the sidebar, or use the AI Entry feature to auto-extract claim data from documents. Fill in the required fields: PRO number, carrier, claim type, and amount. Attach supporting documents like BOL, POD, and invoices.' },
      { question: 'What documents do I need?', answer: 'Required documents depend on claim type:\n\n- Damage: BOL, POD (with damage noted), photos, product invoice\n- Shortage: BOL, POD (with shortage noted), product invoice\n- Loss: BOL, product invoice, proof of non-delivery\n- Concealed Damage: BOL, POD, photos, invoice, inspection report (within 15 days)' },
      { question: 'What are the filing deadlines?', answer: 'Under the Carmack Amendment, you have 9 months from the delivery date (or expected delivery date for lost shipments) to file a claim. The carrier must acknowledge receipt within 30 days and provide a disposition within 120 days.' },
      { question: 'How do I track my claim status?', answer: 'Go to Claims > Claims List to see all your claims with their current status. Click any claim to see the full timeline, documents, and communication history. You can also set up notifications to be alerted on status changes.' },
      { question: 'Can I upload multiple claims at once?', answer: 'Yes! Use the Mass Upload feature under Claims > Mass Upload. You can upload a CSV file with claim data or drag-and-drop multiple document sets for AI processing.' },
    ],
  },
  {
    id: 'ai',
    title: 'AI Features',
    icon: Bot,
    description: 'Using AI-powered tools for claim management',
    faqs: [
      { question: 'What is AI Entry?', answer: 'AI Entry uses artificial intelligence to automatically read your documents (BOLs, invoices, PODs) and extract claim data. Upload your documents and the AI will fill in carrier info, PRO numbers, amounts, and more — then you review and approve.' },
      { question: 'How does the AI Copilot work?', answer: 'The AI Copilot is your intelligent assistant for claims. Ask it questions about specific claims, request analysis, or get recommendations. It understands Carmack Amendment rules and can help draft correspondence.' },
      { question: 'What is Carrier Risk Scoring?', answer: 'The AI analyzes each carrier\'s claim history — approval rates, resolution times, payment speeds — and generates a risk score (A-F). Use this to evaluate carrier reliability and anticipate claim outcomes.' },
      { question: 'How does fraud detection work?', answer: 'The system automatically checks new claims for anomalies: duplicate claims, unusual amounts, suspicious timing patterns. Flagged claims are reviewed by your team before processing.' },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: Upload,
    description: 'Uploading, managing, and organizing documents',
    faqs: [
      { question: 'What file formats are supported?', answer: 'PDF is the primary format for AI processing. We also support JPEG, PNG, TIFF, DOCX, and XLSX for general document storage. Maximum file size is 25MB per file.' },
      { question: 'How is document classification done?', answer: 'When you upload documents through AI Entry, the AI automatically classifies each document (BOL, POD, Invoice, etc.) and extracts relevant data. You can always reclassify manually.' },
    ],
  },
  {
    id: 'email',
    title: 'Email & Communication',
    icon: Mail,
    description: 'Email integration and carrier communication',
    faqs: [
      { question: 'Can I send emails directly from FreightClaims?', answer: 'Yes. From any claim detail page, click the Email tab to compose and send emails. All correspondence is logged on the claim timeline. You can use templates for common messages like follow-ups and demand letters.' },
      { question: 'How does email submission work?', answer: 'Configure your submission email address under Settings > Email Submission. Forward claim-related emails to that address and the AI will automatically parse them and create draft claims for your review.' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    icon: BarChart3,
    description: 'Insights, dashboards, and data exports',
    faqs: [
      { question: 'What reports are available?', answer: 'The Reports section includes: claim status breakdown, top carriers/customers, collection rates, settlement trends, write-off analysis, metrics by carrier/destination, and custom report builder. All reports can be exported to CSV or PDF.' },
      { question: 'How do I create a custom report?', answer: 'Go to Reports > New Report. Select your data source, choose filters (date range, carrier, customer, claim type), pick the fields to include, and choose a visualization type. Save reports to run them again later.' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    icon: Settings,
    description: 'User management, roles, and settings',
    faqs: [
      { question: 'How do I add team members?', answer: 'Go to Settings > Users and click "Invite User". Enter their email, assign a role, and they\'ll receive an invitation. Roles control what features and data each user can access.' },
      { question: 'How do roles and permissions work?', answer: 'Roles define a set of permissions across the platform. Go to Settings > Roles to see available roles or create custom ones. Permissions are granular — you can control access to specific modules (claims, reports, AI) and actions (view, create, edit, delete).' },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());

  const toggleFaq = (key: string) => {
    setExpandedFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCategories = helpCategories.filter((cat) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      cat.title.toLowerCase().includes(s) ||
      cat.faqs.some((f) => f.question.toLowerCase().includes(s) || f.answer.toLowerCase().includes(s))
    );
  });

  const currentCategory = selectedCategory ? helpCategories.find((c) => c.id === selectedCategory) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary-500" /> Help Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Find answers, learn features, and get support</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help articles..."
          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/50"
        />
      </div>

      {!currentCategory ? (
        <>
          {/* Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="card p-5 text-left hover:shadow-card-hover transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-3">
                  <cat.icon className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{cat.description}</p>
                <p className="text-xs text-primary-500 mt-3 font-medium flex items-center gap-1">
                  {cat.faqs.length} articles <ChevronRight className="w-3.5 h-3.5" />
                </p>
              </button>
            ))}
          </div>

          {/* Contact Support */}
          <div className="card p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-500/5 dark:to-blue-500/5 border-primary-200/50 dark:border-primary-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Need more help?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Can't find what you're looking for? Contact our support team or use the AI chatbot for instant answers.
                </p>
                <div className="flex gap-3 mt-4">
                  <a href="mailto:support@freightclaims.com" className="text-sm font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1">
                    Email Support <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Category Detail */
        <div>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium mb-4 flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to all categories
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
              <currentCategory.icon className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentCategory.title}</h2>
              <p className="text-sm text-slate-500">{currentCategory.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            {currentCategory.faqs.map((faq, i) => {
              const key = `${currentCategory.id}-${i}`;
              const isExpanded = expandedFaqs.has(key);
              return (
                <div key={key} className="card overflow-hidden">
                  <button
                    onClick={() => toggleFaq(key)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <span className="font-medium text-slate-900 dark:text-white text-sm pr-4">{faq.question}</span>
                    <ChevronDown className={cn('w-5 h-5 text-slate-400 flex-shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line border-t border-slate-100 dark:border-slate-700 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
