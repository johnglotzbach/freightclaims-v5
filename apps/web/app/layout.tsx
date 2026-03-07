/**
 * Root Layout - Application shell with comprehensive SEO and providers
 *
 * Sets up global HTML structure, fonts, theme provider, React Query,
 * toast notifications, and SEO metadata (OpenGraph, Twitter Cards, etc.)
 *
 * Location: apps/web/app/layout.tsx
 */
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'FreightClaims - AI-Powered Freight Claims Management',
    template: '%s | FreightClaims',
  },
  description: 'The leading SaaS platform for freight claim lifecycle management. File, track, negotiate, and settle cargo claims with AI-powered automation. Carmack Amendment compliance built in.',
  keywords: [
    'freight claims', 'cargo claims', 'shipping claims', 'claim management',
    'logistics', 'Carmack Amendment', 'freight damage', 'carrier claims',
    'claim automation', 'AI claims processing', 'freight claim software',
  ],
  authors: [{ name: 'FreightClaims.com' }],
  creator: 'FreightClaims.com',
  publisher: 'FreightClaims.com',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://freightclaims.com',
    siteName: 'FreightClaims',
    title: 'FreightClaims - AI-Powered Freight Claims Management',
    description: 'The leading SaaS platform for freight claim lifecycle management with AI automation.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreightClaims - AI-Powered Freight Claims Management',
    description: 'File, track, negotiate, and settle freight claims with AI-powered automation.',
  },
  metadataBase: new URL('https://freightclaims.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <QueryProvider>
            {children}
            <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
