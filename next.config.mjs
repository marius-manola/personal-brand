

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Content Studio verifies production builds without touching the running
  // development server's .next directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true,
  },
  // Local studio files are gitignored. Do not let unused vars in that
  // dashboard fail the publish build that is supposed to verify the blog post.
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_DIST_DIR === '.next-content-studio-build',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600],
    imageSizes: [256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  async redirects() {
    return [
      { source: '/blog/:file.png', destination: '/blog/:file.webp', permanent: true },
      { source: '/blog/:file.jpg', destination: '/blog/:file.webp', permanent: true },
      { source: '/blog/:file.jpeg', destination: '/blog/:file.webp', permanent: true },
    ];
  },
};

export default nextConfig;
