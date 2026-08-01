import type { Metadata } from 'next'
import Link from 'next/link'

import { OpenAppFallback } from '@/components/open-app-fallback'
import { siteConfig, siteRoutes } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Page not found | ${siteConfig.name}`,
  description: 'This page does not exist on NessaChat.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16 text-center text-white">
      <p className="mb-2 text-sm font-medium text-violet-400">404</p>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">Page not found</h1>
      <p className="mb-8 max-w-md text-sm text-gray-400">
        That link doesn&apos;t match a page on {siteConfig.name}. Check the URL, or open the app if you were
        following a share link.
      </p>
      <div className="mb-8 flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href="/"
          className="rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white no-underline hover:bg-violet-500"
        >
          Go home
        </Link>
        <Link
          href={siteRoutes.privacyPolicy}
          className="text-violet-400 no-underline hover:text-violet-300"
        >
          Privacy Policy
        </Link>
      </div>
      <OpenAppFallback openLabel="Open NessaChat" />
    </div>
  )
}
