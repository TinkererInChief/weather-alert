/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  eslint: {
    // Temporarily disabled due to styling warnings - can be re-enabled after cleanup
    ignoreDuringBuilds: true,
  },
  async headers() {
    // Allow unsafe-eval in development for Next.js hot module replacement
    const isDev = process.env.NODE_ENV === 'development'
    const scriptSrc = isDev 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'"
    
    const csp = [
      "default-src 'self'",
      // Allow inline styles for Tailwind preflight utilities
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      // Allow connections to required external APIs and captcha
      "connect-src 'self' https://api.usgs.gov https://earthquake.usgs.gov https://api.weather.gov https://www.tsunami.gov https://hcaptcha.com https://*.hcaptcha.com https://service.iris.edu https://www.seismicportal.eu https://www.data.jma.go.jp https://api.sendgrid.com https://api.twilio.com",
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
  async redirects() {
    return [
      {
        source: '/contacts',
        destination: '/contact',
        permanent: true,
      },
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
