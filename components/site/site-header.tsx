'use client'

/**
 * Public-site header: brand, primary navigation, account, "Get the app".
 * Desktop: inline nav. Phone / tablet: a full-height menu with the same
 * links, a "Claim your place" card for owners, and account actions.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { AccountMenu } from '@/components/account/account-menu'
import { Icon } from '@/components/dash/icons'
import { Container, StoreBadges, cx, siteButtonClass } from '@/components/site/ui'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes, adminConsoleHref } from '@/lib/account/constants'
import { readMyAdminRole } from '@/lib/admin'
import { siteRoutes } from '@/lib/constants'

export const SITE_NAV = [
  { href: '/places', label: 'Explore places', match: ['/places', '/place'] },
  { href: '/chat', label: 'Instant chat', match: ['/chat'] },
  { href: siteRoutes.forBusinesses, label: 'For businesses', match: [siteRoutes.forBusinesses, '/business/claim'] },
  { href: siteRoutes.about, label: 'About', match: [siteRoutes.about] },
]

function isActive(pathname: string, match: string[]): boolean {
  return match.some(m => pathname === m || pathname.startsWith(`${m}/`))
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx('flex items-center gap-2.5 text-n-ink no-underline', className)} aria-label="NessaChat home">
      <Image src="/logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px]" priority />
      <span className="text-[17px] font-semibold tracking-[-0.02em]">NessaChat</span>
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the phone menu on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      className={cx(
        'sticky top-0 z-40 border-b bg-n-canvas/90 backdrop-blur-md transition-colors supports-[backdrop-filter]:bg-n-canvas/80',
        scrolled || open ? 'border-n-line' : 'border-transparent',
      )}
    >
      <Container className="flex h-16 items-center gap-6">
        <Brand />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {SITE_NAV.map(item => {
              const active = isActive(pathname, item.match)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'rounded-lg px-3 py-2 text-[14px] font-medium no-underline transition-colors',
                      active ? 'text-n-ink' : 'text-n-muted hover:bg-n-hover hover:text-n-ink',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/places#search"
            aria-label="Search places"
            className="flex size-10 items-center justify-center rounded-full text-n-ink-2 hover:bg-n-hover lg:hidden"
          >
            <Icon name="search" size={20} />
          </Link>
          <div className="hidden items-center gap-3 lg:flex">
            <AccountMenu tone="light" />
            <a href="#get-the-app" className={siteButtonClass('dark', 'md')}>
              Get the app
            </a>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-n-ink hover:bg-n-hover lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(v => !v)}
          >
            <Icon name={open ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </Container>
      {open ? createPortal(<MobileMenu pathname={pathname} onClose={() => setOpen(false)} />, document.body) : null}
    </header>
  )
}

function MobileMenu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const { user, loading, signOut } = useAccountAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void readMyAdminRole(user.uid).then(r => !cancelled && setIsAdmin(Boolean(r)))
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div
      id="site-menu"
      className="n-site n-anim-fade fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-n-line bg-n-canvas lg:hidden"
    >
      <Container className="flex min-h-full flex-col gap-6 py-5">
        <nav aria-label="Main">
          <ul className="divide-y divide-n-line-soft">
            {SITE_NAV.map(item => {
              const active = isActive(pathname, item.match)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className="flex items-center justify-between py-3.5 text-[19px] font-semibold tracking-[-0.02em] text-n-ink no-underline"
                  >
                    {item.label}
                    <Icon name="chevron-right" size={18} className="text-n-faint" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <Link
          href={`${siteRoutes.forBusinesses}#find`}
          onClick={onClose}
          className="flex items-center gap-3 rounded-2xl border border-n-accent-line bg-n-accent-soft p-4 text-n-ink no-underline"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-n-accent text-white">
            <Icon name="store" size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">Own a place? Claim it — free</span>
            <span className="block text-[13px] text-n-muted">Verified page, live chat, QR codes and stats.</span>
          </span>
        </Link>

        <div className="space-y-2">
          {loading ? null : user ? (
            <>
              <p className="truncate text-[13px] text-n-muted">Signed in as {user.email}</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href={accountRoutes.business} onClick={onClose} className={siteButtonClass('secondary', 'md')}>
                  Your business
                </Link>
                {isAdmin ? (
                  <a href={adminConsoleHref()} className={siteButtonClass('secondary', 'md')}>
                    Admin console
                  </a>
                ) : (
                  <button
                    type="button"
                    className={siteButtonClass('ghost', 'md')}
                    onClick={() => {
                      onClose()
                      void signOut().then(() => router.refresh())
                    }}
                  >
                    Sign out
                  </button>
                )}
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  className={siteButtonClass('ghost', 'md', 'w-full')}
                  onClick={() => {
                    onClose()
                    void signOut().then(() => router.refresh())
                  }}
                >
                  Sign out
                </button>
              ) : null}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href={accountRoutes.signIn} onClick={onClose} className={siteButtonClass('secondary', 'md')}>
                Sign in
              </Link>
              <Link href={accountRoutes.signUp} onClick={onClose} className={siteButtonClass('primary', 'md')}>
                Create account
              </Link>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-n-line pt-5">
          <p className="mb-3 text-[13px] font-medium text-n-muted">Get the NessaChat app</p>
          <StoreBadges />
        </div>
      </Container>
    </div>
  )
}
