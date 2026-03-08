import Link from 'next/link';
import { Truck, ChevronDown, Users } from 'lucide-react';

export function PublicNavbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Freight<span className="text-primary-500">Claims</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">.com</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Link href="/features" className="hover:text-primary-500 transition-colors">Our Software</Link>
          <Link href="/#pricing" className="hover:text-primary-500 transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-primary-500 transition-colors">About Us</Link>
          <div className="relative group">
            <button className="flex items-center gap-1 hover:text-primary-500 transition-colors">
              Resources <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 w-52">
                <Link href="/claim-assistance" className="block px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary-500 transition-colors">Claim Assistance</Link>
                <Link href="/features#security" className="block px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary-500 transition-colors">Partnerships</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/claim-assistance"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary-500 transition-colors border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2"
          >
            Claim Assistance
          </Link>
          <Link
            href="/book-demo"
            className="bg-accent-500 hover:bg-accent-600 text-white px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-accent-500/20 hover:shadow-lg"
          >
            Book Demo
          </Link>
          <Link
            href="/login"
            className="flex flex-col items-center text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors pl-1"
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="hidden sm:inline">LOGIN</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
