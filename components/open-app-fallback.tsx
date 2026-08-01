import Link from 'next/link'

import {
  APP_OPEN_DEEP_LINK,
  appStores,
  siteConfig,
  siteRoutes,
} from '@/lib/constants'

type OpenAppFallbackProps = {
  /**
   * Custom scheme deep link.
   * Defaults to `nessachat://open` (supported on iOS + Android).
   * Profile landings pass `nessachat://profile/{uid}` instead.
   */
  deepLink?: string
  /** Primary button label when a deep link is provided */
  openLabel?: string
  className?: string
}

/**
 * Safe “open app / get the app” CTA — never dumps users on a blank page.
 * Does not auto-redirect unknown routes into the app.
 */
export function OpenAppFallback({
  deepLink = APP_OPEN_DEEP_LINK,
  openLabel = 'Open NessaChat',
  className = '',
}: OpenAppFallbackProps) {
  return (
    <div className={`flex w-full max-w-sm flex-col items-center gap-3 ${className}`}>
      <a
        href={deepLink}
        className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-violet-500"
      >
        {openLabel}
      </a>
      <p className="text-xs text-gray-500">Don&apos;t have the app?</p>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        {appStores.map(store => (
          <a
            key={store.name}
            href={store.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-200 no-underline hover:bg-white/10"
          >
            {store.label}
          </a>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-gray-600">
        <Link href="/" className="text-violet-400 no-underline hover:text-violet-300">
          {siteConfig.name} home
        </Link>
        {' · '}
        <Link
          href={siteRoutes.privacyPolicy}
          className="text-violet-400 no-underline hover:text-violet-300"
        >
          Privacy
        </Link>
      </p>
    </div>
  )
}
