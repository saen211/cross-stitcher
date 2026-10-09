const isStaticExport = process.env.STATIC_EXPORT === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // `npm run build:static` emits a plain HTML/JS/CSS site into ./out
  ...(isStaticExport && {
    output: 'export',
    // Emit /print/index.html so any static host can serve /print
    trailingSlash: true,
  }),
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config, { isServer }) => {
    // Konva requires 'canvas' on server side but we only use it client-side
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'konva'];
    }
    return config;
  },
};

module.exports = nextConfig;
