import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'

/** Every public page: skip link, header, main landmark, footer. */
export function SiteShell({
  children,
  footer = true,
  bottomBar = false,
}: {
  children: ReactNode
  footer?: boolean
  /** Page shows a fixed bottom action bar on phones: keep the footer clear of it. */
  bottomBar?: boolean
}) {
  return (
    <div className={`n-site flex min-h-dvh flex-col ${bottomBar ? 'pb-[84px] lg:pb-0' : ''}`}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-n-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {footer ? <SiteFooter /> : null}
    </div>
  )
}
