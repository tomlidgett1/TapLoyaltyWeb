/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Suppress specific console errors in development
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const message = args[0];
        if (
          typeof message === 'string' &&
          (message.includes('DialogContent` requires a `DialogTitle`') ||
           message.includes('radix-ui.com/primitives/docs/components/dialog'))
        ) {
          return; // Suppress these specific errors
        }
        originalConsoleError.apply(console, args);
      };
    }
    return config;
  },
};

module.exports = nextConfig;
