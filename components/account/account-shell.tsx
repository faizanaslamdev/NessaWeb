import Link from 'next/link'
import type { ReactNode } from 'react'

import { siteConfig, siteRoutes } from '@/lib/constants'

/** Shared frame for the account pages — same look as /auth/action. */
export function AccountShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-md">
        <p className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-violet-400">
          {siteConfig.name}
        </p>
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mb-6 text-center text-sm text-gray-400">{subtitle}</p>
        ) : (
          <div className="mb-6" />
        )}
        {children}
        {footer ? <div className="mt-6 text-center text-sm text-gray-400">{footer}</div> : null}
        <p className="mt-8 text-center text-xs text-gray-600">
          <Link href={siteRoutes.privacyPolicy} className="text-violet-400 hover:text-violet-300">
            Privacy
          </Link>
          {' · '}
          <Link href={siteRoutes.termsOfService} className="text-violet-400 hover:text-violet-300">
            Terms
          </Link>
        </p>
      </div>
    </div>
  )
}

export const accountFieldClass =
  'mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500'

export const accountButtonClass =
  'w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60'

export const accountCardClass = 'space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5'
