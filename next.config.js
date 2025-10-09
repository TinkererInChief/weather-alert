/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react', 'react-map-gl', 'mapbox-gl'],
  eslint: {
    // Temporarily disabled due to styling warnings - can be re-enabled after cleanup
    ignoreDuringBuilds: true,
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Mapbox + APIs + inline styles for Tailwind preflight utilities
      "script-src 'self' 'unsafe-inline' https://api.mapbox.com blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com https://api.mapbox.com",
      // Enhanced Mapbox CSP: include all tile subdomains and APIs
      "connect-src 'self' https://*.mapbox.com https://api.mapbox.com https://events.mapbox.com",
      "worker-src 'self' blob:",
      "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' }
        ]
      }
    ]
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
