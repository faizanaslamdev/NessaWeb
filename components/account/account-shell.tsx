import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { siteRoutes } from '@/lib/constants'

const PUBLIC_ORIGIN = 'https://www.nessachat.com'

/**
 * Frame for the account pages (sign in, sign up, reset, invite). Same light
 * theme and logo as the site; also served on the admin console host, so it
 * keeps its own slim header (public-site links would be rewritten there) and
 * links legal pages by absolute URL.
 */
export function AccountShell({
  title,
  subtitle,
  children,
  footer,
  wide,
  aside = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** Show the "one account for app and web" panel beside the form (desktop). */
  aside?: boolean
}) {
  return (
    <div className="n-dash n-site flex min-h-dvh flex-col bg-n-canvas text-n-ink antialiased">
      <header className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-n-ink no-underline">
          <Image src="/logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px]" priority />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">NessaChat</span>
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-12 sm:pt-12 lg:items-center lg:pt-0">
        <div className={aside ? 'grid w-full max-w-[960px] items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16' : 'contents'}>
          {aside ? (
            <div className="order-2 hidden lg:order-1 lg:block">
              <h2 className="n-display text-[34px] leading-[1.1]">One account for the app and the web.</h2>
              <p className="mt-4 text-[16px] leading-7 text-n-muted">
                Sign in with the same email and password you use in the NessaChat app.
              </p>
              <ul className="mt-8 space-y-4 text-[15px] text-n-ink-2">
                {[
                  ['Manage your place', 'Verified page, live chat, QR codes and stats.'],
                  ['Claim a business', 'Send a claim for the place you run — it’s free.'],
                  ['Keep it secure', 'Business tools need a verified email.'],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-n-accent-soft text-[13px] font-bold text-n-accent">
                      ✓
                    </span>
                    <span>
                      <span className="block font-semibold text-n-ink">{t}</span>
                      <span className="block text-n-muted">{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={`order-1 mx-auto w-full lg:order-2 ${wide ? 'max-w-xl' : 'max-w-[420px]'}`}>
            <h1 className="text-center text-[28px] leading-9 font-semibold tracking-[-0.025em]">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 mb-6 text-center text-[15px] text-n-muted">{subtitle}</p>
            ) : (
              <div className="mb-6" />
            )}
            {children}
            {footer ? <div className="mt-6 text-center text-sm text-n-muted">{footer}</div> : null}
          </div>
        </div>
      </main>
      <footer className="pb-6 text-center text-xs text-n-subtle">
        <a href={`${PUBLIC_ORIGIN}${siteRoutes.privacyPolicy}`} className="text-n-subtle no-underline hover:text-n-ink">
          Privacy
        </a>
        <span aria-hidden> · </span>
        <a href={`${PUBLIC_ORIGIN}${siteRoutes.termsOfService}`} className="text-n-subtle no-underline hover:text-n-ink">
          Terms
        </a>
      </footer>
    </div>
  )
}

export const accountFieldClass =
  'mt-1.5 block w-full rounded-[10px] border border-n-line-strong bg-n-surface px-3 py-2.5 text-[15px] text-n-ink shadow-n-card outline-none transition-colors placeholder:text-n-faint hover:border-n-faint focus:border-n-accent focus:ring-3 focus:ring-n-accent/15 disabled:bg-n-sunken sm:text-sm'

export const accountButtonClass =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-n-accent px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(74_54_201/0.35)] transition-colors hover:bg-n-accent-strong disabled:opacity-60'

export const accountCardClass = 'space-y-4 rounded-[14px] border border-n-line bg-n-surface p-5 shadow-n-card sm:p-6'
