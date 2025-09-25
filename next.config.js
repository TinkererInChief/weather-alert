/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  webpack: (config) => {
    // Fix for Prisma in production
    config.externals.push({
      '@prisma/client': 'commonjs @prisma/client'
    })
    return config
  },
}

module.exports = nextConfig
