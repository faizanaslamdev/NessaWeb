import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { siteRoutes } from '@/lib/constants'

/**
 * Frame for the account pages (sign in, sign up, reset, claim, invite).
 * Light dashboard theme with the NessaChat logo.
 */
export function AccountShell({
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return (
    <div className="n-dash flex min-h-dvh flex-col bg-n-canvas text-n-ink antialiased">
      <header className="flex h-14 items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-n-ink no-underline">
          <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">NessaChat</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pt-6 pb-12 sm:pt-12">
        <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-[420px]'}`}>
          <h1 className="text-center text-[26px] leading-8 font-semibold tracking-[-0.025em]">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 mb-6 text-center text-sm text-n-muted">{subtitle}</p>
          ) : (
            <div className="mb-6" />
          )}
          {children}
          {footer ? <div className="mt-6 text-center text-sm text-n-muted">{footer}</div> : null}
        </div>
      </main>
      <footer className="pb-6 text-center text-xs text-n-subtle">
        <Link href={siteRoutes.privacyPolicy} className="text-n-subtle hover:text-n-ink">
          Privacy
        </Link>
        <span aria-hidden> · </span>
        <Link href={siteRoutes.termsOfService} className="text-n-subtle hover:text-n-ink">
          Terms
        </Link>
      </footer>
    </div>
  )
}

export const accountFieldClass =
  'mt-1.5 block w-full rounded-[10px] border border-n-line-strong bg-n-surface px-3 py-2.5 text-[15px] text-n-ink shadow-n-card outline-none transition-colors placeholder:text-n-faint hover:border-n-faint focus:border-n-accent focus:ring-3 focus:ring-n-accent/15 disabled:bg-n-sunken sm:text-sm'

export const accountButtonClass =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-n-accent px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(74_54_201/0.35)] transition-colors hover:bg-n-accent-strong disabled:opacity-60'

export const accountCardClass = 'space-y-4 rounded-[14px] border border-n-line bg-n-surface p-5 shadow-n-card sm:p-6'
