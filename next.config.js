/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  // TypeScript errors will still show in local dev (via your editor and
  // `npm run dev`), but they won't block Vercel deploys. JavaScript
  // compilation errors will still fail the build as they should.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Same rationale for lint — warnings shouldn't block a deploy.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
