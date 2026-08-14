

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Content Studio verifies production builds without touching the running
  // development server's .next directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true,
  },
};

export default nextConfig;
