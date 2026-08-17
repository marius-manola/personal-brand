

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
};

export default nextConfig;
