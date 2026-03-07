/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
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
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/:path*`,
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
