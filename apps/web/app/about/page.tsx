/**
 * About Us Page — Company story, mission, leadership, and platform overview
 *
 * Matches the old FreightClaims.com About Us page content including
 * the "Making Claims Sexy. Again!" tagline and real leadership bios.
 *
 * Location: apps/web/app/about/page.tsx
 */
import Link from 'next/link';
import {
  Truck, ArrowRight, Shield, Brain, Users, Award,
  Target, CheckCircle2, Globe, Clock, Sparkles, Linkedin,
} from 'lucide-react';

export const metadata = {
  title: 'About Us',
  description: 'Learn about FreightClaims.com — the team and mission behind the industry\'s leading AI-powered freight claims platform.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Freight<span className="text-primary-500">Claims</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">.com</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/book-demo" className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-accent-500/20">Book Demo</Link>
            <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary-500">Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero — "Making Claims Sexy. Again!" */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Making Claims Sexy.{' '}
            <span className="text-accent-500">Again!</span>
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            Through Software as a Service (SaaS) services featuring software for freight claims management.
          </p>

          <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-2xl mx-auto leading-relaxed">
            Created by freight industry veterans, FreightClaims.com is the culmination of decades of experience
            of handling claims, and evolving a practice for streamlining the process for the future. The future
            is now, and FreightClaims.com has changed the game for brokers &amp; shippers alike.
          </p>

          <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-2xl mx-auto leading-relaxed">
            Gone are the days of managing claims in manual spreadsheets or clunky outdated processes. We have
            brought the age of AI automation to the claims process, and committed to supporting brokers &amp;
            shippers with the automations they deserve — fitting perfectly into their current tech stacks.
          </p>
        </div>
      </section>

      {/* Our Leadership */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center mb-16">
            Our <span className="text-accent-500">Leadership</span>
          </h2>

          {/* Michael Schember — Founder & CEO */}
          <div className="grid md:grid-cols-2 gap-10 lg:gap-14 items-center mb-20">
            <div className="relative">
              <div className="aspect-[4/5] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-4xl font-bold text-primary-500">MS</span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Photo</span>
                </div>
              </div>
              {/* Decorative dots */}
              <div className="absolute -bottom-4 -left-4 w-20 h-20 grid grid-cols-4 gap-1.5 opacity-20">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Michael Schember</h3>
              <p className="text-accent-500 font-bold text-sm uppercase tracking-wider mt-1">Founder &amp; CEO</p>
              <p className="text-slate-600 dark:text-slate-400 mt-5 leading-relaxed">
                Michael Schember, founder and CEO of FreightClaims.com, brings over 25 years of expertise
                in the freight claims industry from both carrier and broker perspectives. He has
                revolutionized the freight claims process by digitizing and streamlining it through
                cloud-based solutions that integrate with carriers and forwarders.
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                His mission is to educate the industry on best practices and help companies navigate the
                complexities of freight claims.
              </p>
            </div>
          </div>

          {/* Brad Berlin — COO */}
          <div className="grid md:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Brad Berlin</h3>
              <p className="text-accent-500 font-bold text-sm uppercase tracking-wider mt-1">Chief Operations Officer</p>
              <p className="text-slate-600 dark:text-slate-400 mt-5 leading-relaxed">
                As the Chief Operating Officer of FreightClaims.com, Brad is dedicated to optimizing the
                freight claim process for shippers and logistics professionals. With a focus on streamlining
                operations and reducing inefficiencies, he helps businesses gain peace of mind while
                improving their bottom line.
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                By delivering innovative solutions, he ensures that clients can navigate the complexities
                of freight claims with confidence and ease.
              </p>
            </div>
            <div className="relative order-1 md:order-2">
              <div className="aspect-[4/5] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-4xl font-bold text-primary-500">BB</span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Photo</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 grid grid-cols-4 gap-1.5 opacity-20">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Stats */}
      <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Our Mission</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-5 leading-relaxed">
                Every shipper, broker, and 3PL deserves a claims process that&apos;s fast, transparent, and
                thorough. Our mission is to eliminate the friction in freight claims management — replacing
                manual work with intelligent automation so teams can focus on recovering money, not chasing
                paperwork.
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                With v5.0, we&apos;ve introduced AI agents that handle intake, compliance, negotiation, and
                follow-ups automatically. The result: claims handled in days instead of weeks, zero missed
                deadlines, and higher recovery rates.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Target, value: '$50B+', label: 'In annual cargo losses we help fight' },
                { icon: Clock, value: '70%', label: 'Reduction in processing time' },
                { icon: Shield, value: '0', label: 'Missed Carmack deadlines' },
                { icon: Award, value: '94%', label: 'Average settlement rate' },
              ].map((s) => (
                <div key={s.label} className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
                  <s.icon className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center mb-14">What Drives Us</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Security First', description: 'Multi-tenant isolation, encrypted storage, audit trails. Your data is yours — period.' },
              { icon: Brain, title: 'AI That Helps', description: 'Agents that augment your team, not replace it. Critical actions always need human approval.' },
              { icon: Users, title: 'Built for Teams', description: 'Granular permissions, role-based access, and onboarding designed for real claims teams.' },
              { icon: Globe, title: 'Industry Focused', description: 'Carmack compliance, carrier intelligence, and settlement strategies built on domain expertise.' },
            ].map((v) => (
              <div key={v.title} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-4">
                  <v.icon className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{v.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Resources */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-accent-50/50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Recommended <span className="text-accent-500">Resources</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3">
              Here are our recommended resources to help you run your business better, faster, and stronger.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'CLAIM ASSISTANCE',
                description: 'Our team of claims professionals can provide you and your team with answers & support, to help your operation navigate the in\'s & out\'s of the claim process.',
                cta: 'Get in Touch',
                href: '/claim-assistance',
              },
              {
                title: 'PARTNERSHIPS & INTEGRATIONS',
                description: 'We partner with industry-leading companies to provide shippers and brokers with a centralized platform for managing every aspect of claims process.',
                cta: 'Learn More',
                href: '/features',
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center hover:shadow-xl transition-all duration-300"
              >
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wider mb-4">{card.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{card.description}</p>
                <span className="inline-flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                  {card.cta}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to see it in action?</h2>
          <p className="text-primary-100 text-lg mb-8">Book a personalized demo or start your free trial today.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/book-demo" className="inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-primary-50 px-8 py-3.5 rounded-xl font-bold transition-colors">Book a Demo <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/register" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-800 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors border border-primary-400">Start Free Trial</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"><Truck className="w-4 h-4 text-white" /></div>
                <span className="text-lg font-bold text-white">FreightClaims</span>
              </Link>
              <p className="text-sm leading-relaxed mb-3">The #1 Trusted Platform for Supply Chain Claims</p>
              <p className="text-xs italic mb-4">Freight Claims Simplified&trade;</p>
              <div className="flex items-center gap-3">
                <a href="https://linkedin.com/company/freightclaims" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:border-primary-500 hover:text-primary-400 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Our Software</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/book-demo" className="hover:text-white transition-colors">Book a Demo</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Free Trial</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">About Us</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/claim-assistance" className="hover:text-white transition-colors">Claim Assistance</Link></li>
                <li><Link href="/features" className="hover:text-white transition-colors">Partnerships</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span>&copy; 2026 FreightClaims.com | All Rights Reserved</span>
            <div className="flex gap-4">
              <Link href="/support" className="hover:text-white transition-colors">Software Status</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">External End User License Agreement</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
