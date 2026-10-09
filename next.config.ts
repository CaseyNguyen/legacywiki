import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // sharp is used server-side for logo color extraction.
  serverExternalPackages: ['sharp'],
  images: { unoptimized: true },
};

export default nextConfig;
