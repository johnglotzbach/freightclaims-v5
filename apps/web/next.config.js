/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'freightclaims.com' },
      { protocol: 'https', hostname: '*.freightclaims.com' },
      { protocol: 'https', hostname: 'freightclaims-documents.s3.us-east-2.amazonaws.com' },
      { protocol: 'https', hostname: 'freightclaims-documents.s3.amazonaws.com' },
    ],
  },
  async rewrites() {
    const host = process.env.INTERNAL_API_HOST;
    const apiBase = host ? `http://${host}` : 'http://localhost:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
      {
        source: '/ai-health',
        destination: `${apiBase}/ai-health`,
      },
      {
        source: '/health',
        destination: `${apiBase}/health`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
