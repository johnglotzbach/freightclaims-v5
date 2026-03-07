import Link from 'next/link';
import { Truck, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-200 dark:border-slate-800">
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
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl font-extrabold text-primary-500 mb-4">404</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <Link href="/support" className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-medium hover:border-primary-300 transition-colors">
              <Search className="w-4 h-4" /> Help Center
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
