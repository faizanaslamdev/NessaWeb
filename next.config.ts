import type { NextConfig } from 'next'

/**
 * Admin console host. The same app serves admin.nessachat.com: every path
 * there maps to /admin/* (account, auth, Next assets and files excluded),
 * so admin.nessachat.com/places is /admin/places. Any `admin.` host matches,
 * which also covers local testing (admin.localhost).
 */
const ADMIN_HOST_PATTERN = 'admin\\..+'

/**
 * Once admin.nessachat.com is live, set NEXT_PUBLIC_ADMIN_ORIGIN
 * (https://admin.nessachat.com) in Vercel: www…/admin/* then redirects there
 * and account menus link to it. Unset, the console stays at www…/admin.
 */
const ADMIN_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/$/, '') ?? ''

const nextConfig: NextConfig = {
  async redirects() {
    return [
      /**
       * Canonical legal content lives at `/privacy-policy` and `/terms-of-service`.
       * Short aliases (`/privacy`, `/terms`) permanently redirect so store / app URLs
       * stay stable without duplicated policy copies.
       */
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
      // Chat settings moved to each Place's page (Live chat tab).
      { source: '/admin/chats', destination: '/admin/places', permanent: false },
      { source: '/chats', has: [{ type: 'host' as const, value: ADMIN_HOST_PATTERN }], destination: '/places', permanent: false },
      ...(ADMIN_ORIGIN
        ? [
            {
              source: '/admin/:path*',
              has: [{ type: 'host' as const, value: '(www\\.)?nessachat\\.com' }],
              destination: `${ADMIN_ORIGIN}/:path*`,
              permanent: false,
            },
          ]
        : []),
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: ADMIN_HOST_PATTERN }],
          destination: '/admin',
        },
        {
          source: '/:path((?!admin(?:/|$)|account(?:/|$)|auth(?:/|$)|_next(?:/|$)|__/)(?!.*\\.).+)',
          has: [{ type: 'host', value: ADMIN_HOST_PATTERN }],
          destination: '/admin/:path',
        },
      ],
      afterFiles: [
        // Allow Console Action URL `https://nessachat.com/__/auth/action` (Firebase-style path).
        {
          source: '/__/auth/action',
          destination: '/auth/action',
        },
      ],
      fallback: [],
    }
  },
  async headers() {
    const privateHeaders = [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
    return [
      { source: '/admin/:path*', headers: privateHeaders },
      { source: '/admin', headers: privateHeaders },
      { source: '/business/:path*', headers: privateHeaders },
      { source: '/business', headers: privateHeaders },
      { source: '/:path*', has: [{ type: 'host', value: ADMIN_HOST_PATTERN }], headers: privateHeaders },
    ]
  },
}

export default nextConfig
