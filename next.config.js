/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  output: 'standalone',
  staticPageGenerationTimeout: 1000,
  compiler: {
    styledComponents: true,
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false
  },
  // Enable Turbopack (default in Next.js 16)
  turbopack: {},
};

module.exports = nextConfig;
