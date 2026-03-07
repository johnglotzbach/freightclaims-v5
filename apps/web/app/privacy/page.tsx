/**
 * Privacy Policy Page
 *
 * Location: apps/web/app/privacy/page.tsx
 */
import Link from 'next/link';
import { Truck, ArrowLeft } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';

export const metadata = {
  title: 'Privacy Policy',
  description: 'FreightClaims.com Privacy Policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: February 1, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">1. Information We Collect</h2>
            <p>When you use FreightClaims.com, we collect information you provide directly — including your name, email address, company name, job title, and phone number during registration and account setup.</p>
            <p>We also collect usage data automatically, including pages visited, features used, IP address, browser type, device information, and session duration. This helps us improve the platform experience.</p>
            <p><strong>Claim Data:</strong> When you use our platform to manage freight claims, we store claim details, shipment information, carrier data, document uploads, and correspondence. This data is processed solely to deliver our service and is never sold to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the FreightClaims.com platform</li>
              <li>Process freight claims and generate analytics reports</li>
              <li>Send service notifications, security alerts, and support messages</li>
              <li>Personalize your experience and deliver AI-powered features</li>
              <li>Comply with legal obligations and enforce our terms of service</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">3. Data Storage & Security</h2>
            <p>All data is stored on Amazon Web Services (AWS) infrastructure in US-based data centers. We use encryption at rest (AES-256) and in transit (TLS 1.3) for all sensitive data.</p>
            <p>Our platform implements multi-tenant isolation ensuring each organization&apos;s data is logically separated. Access is controlled through role-based permissions with full audit logging.</p>
            <p>Document uploads are stored in Amazon S3 with server-side encryption and access via time-limited pre-signed URLs.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">4. AI Processing</h2>
            <p>Our AI features (including the Copilot, automated intake, and document processing) use the Google Gemini API to process your claim data. Claim data sent to AI services is used solely for generating responses and is not used to train third-party models. AI processing follows our data retention and security policies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">5. Data Sharing</h2>
            <p>We do not sell, rent, or trade your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service providers:</strong> AWS (hosting), Google (AI), and other vendors that help us deliver the platform under strict data processing agreements</li>
              <li><strong>Legal requirements:</strong> When required by law, regulation, or valid legal process</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">6. Your Rights</h2>
            <p>You have the right to access, correct, delete, or export your personal data at any time. Organization administrators can manage user data through the platform settings. For data deletion requests, contact <a href="mailto:privacy@freightclaims.com" className="text-primary-500 hover:underline">privacy@freightclaims.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">7. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We use analytics cookies (only with your consent) to understand usage patterns. You can control cookie preferences through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">8. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. Claim data is retained per your organization&apos;s settings and applicable regulations. When you close your account, we delete personal data within 30 days unless retention is required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3">9. Contact Us</h2>
            <p>For privacy-related questions or requests, contact us at:</p>
            <p>Email: <a href="mailto:privacy@freightclaims.com" className="text-primary-500 hover:underline">privacy@freightclaims.com</a></p>
            <p>FreightClaims.com<br />Attn: Privacy Team</p>
          </section>
        </div>
      </main>
    </div>
  );
}
