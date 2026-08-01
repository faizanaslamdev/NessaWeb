import type { NextConfig } from 'next'

/**
 * Canonical legal content lives at `/privacy-policy` and `/terms-of-service`.
 * Short aliases (`/privacy`, `/terms`) permanently redirect so store / app URLs
 * stay stable without duplicated policy copies.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/terms-of-service',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    // Allow Console Action URL `https://nessachat.com/__/auth/action` (Firebase-style path).
    return [
      {
        source: '/__/auth/action',
        destination: '/auth/action',
      },
    ]
  },
}

export default nextConfig
