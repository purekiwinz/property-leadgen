import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['puppeteer-core', 'qrcode'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // @ts-expect-error - turbopack key is used in Next.js 15+ for workspace root
  turbopack: {
    root: typeof process !== 'undefined' ? process.cwd() : '.',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wbncgzpzctoqwzbrbfdg.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
