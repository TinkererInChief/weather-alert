/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  eslint: {
    // Temporarily disabled due to styling warnings - can be re-enabled after cleanup
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Fix for Prisma in production
    config.externals.push({
      '@prisma/client': 'commonjs @prisma/client'
    })
    return config
  },
}

module.exports = nextConfig
