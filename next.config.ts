import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  outputFileTracingIncludes: {
    '/api/isms': ['./supabase/migrations/**/*'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
