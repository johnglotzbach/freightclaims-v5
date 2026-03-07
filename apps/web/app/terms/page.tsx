/**
 * Terms & Conditions / End User License Agreement Page
 *
 * Location: apps/web/app/terms/page.tsx
 */
import Link from 'next/link';
import { Truck, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms & Conditions',
  description: 'FreightClaims.com Terms of Service and End User License Agreement.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Freight<span className="text-primary-500">Claims</span>
              <span className="text-[10px] text-slate-400 font-normal">.com</span>
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-500 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: February 1, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using FreightClaims.com (&quot;the Platform&quot;), you agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, do not use the Platform. These terms apply to all users, including visitors, registered users, and organizational accounts.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">2. Description of Service</h2>
            <p>FreightClaims.com provides a cloud-based Software as a Service (SaaS) platform for freight claims management, including claim filing, tracking, document management, carrier communication, AI-powered automation, analytics, and reporting. The Platform is designed for use by shippers, brokers, 3PLs, and logistics professionals.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Each user must have a unique account — sharing credentials is prohibited. Organization administrators are responsible for managing user access and permissions within their tenant.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">4. Acceptable Use</h2>
            <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms. You shall not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Platform for fraudulent claim filing or misrepresentation</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
              <li>Use automated tools to scrape, crawl, or extract data from the Platform</li>
              <li>Transmit malware, viruses, or other harmful code</li>
              <li>Violate any applicable local, state, national, or international law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">5. Data Ownership</h2>
            <p>You retain full ownership of all data you upload to or create within the Platform, including claim details, documents, and business records. FreightClaims.com has a limited license to process this data solely to provide the Service. Upon account termination, you may export your data within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">6. AI Features Disclaimer</h2>
            <p>The Platform includes AI-powered features for claim processing, document analysis, and recommendations. AI outputs are assistive in nature and should be reviewed by qualified personnel before taking action. FreightClaims.com is not liable for decisions made based solely on AI-generated outputs.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">7. Service Availability</h2>
            <p>We strive for 99.9% uptime but do not guarantee uninterrupted access. We may perform scheduled maintenance with advance notice. We are not liable for downtime caused by factors outside our control, including internet outages, cloud provider issues, or force majeure events.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">8. Payment Terms</h2>
            <p>Subscription fees are billed according to the plan selected during registration. All fees are non-refundable unless otherwise stated. We reserve the right to modify pricing with 30 days advance notice. Failure to pay may result in account suspension.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, FreightClaims.com shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising out of or related to your use of the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">10. Termination</h2>
            <p>Either party may terminate the agreement with 30 days written notice. We may suspend or terminate accounts that violate these Terms immediately. Upon termination, your right to use the Platform ceases and you have 30 days to export your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">11. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Florida.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">12. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of material changes via email or platform notification at least 30 days in advance. Your continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">13. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <p>Email: <a href="mailto:legal@freightclaims.com" className="text-primary-500 hover:underline">legal@freightclaims.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
