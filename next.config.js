const isStaticExport = process.env.STATIC_EXPORT === 'true';
// Subpath the site is hosted under, e.g. '/cross-stitch-site' for a GitHub Pages project site.
// NEXT_PUBLIC_ so client code can build URLs Next doesn't prefix itself (e.g. window.open).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  basePath,
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
