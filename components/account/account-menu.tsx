'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useCustomerThreadsSummary } from '@/components/messages/customer-threads-store'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes, adminConsoleHref } from '@/lib/account/constants'
import { readMyAdminRole, type AdminRole } from '@/lib/admin'
import { MESSAGES_PATH, customerUnreadLabel } from '@/lib/customer-messages'

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name || email || '').trim()
  if (!source) return '?'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase() || '?'
}

/**
 * Public-site account entry: "Sign in" for guests (anonymous Place Chat
 * guests count as signed out), an account menu when signed in. Links only —
 * every page behind it checks access itself.
 */
export function AccountMenu({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { user, loading, signOut } = useAccountAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<AdminRole | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  // One small listener (newest threads only) for the Messages badge.
  const unread = customerUnreadLabel(useCustomerThreadsSummary(user?.uid).unread)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void readMyAdminRole(user.uid).then(r => {
      if (!cancelled) setRole(r)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const light = tone === 'light'
  const linkTone = light ? 'text-n-ink-2 hover:text-n-ink' : 'text-gray-300 hover:text-white'
  const menuClass = light
    ? 'absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-n-line bg-n-surface py-1 text-sm text-n-ink-2 shadow-n-pop'
    : 'absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-white/10 bg-neutral-950 py-1 text-sm text-gray-200 shadow-xl'
  const itemClass = light ? 'block px-3 py-2 text-n-ink-2 no-underline hover:bg-n-hover hover:text-n-ink' : 'block px-3 py-2 hover:bg-white/5'

  if (loading) {
    return <span aria-hidden className="inline-block h-9 w-16" />
  }

  if (!user) {
    return (
      <Link href={accountRoutes.signIn} className={`text-sm font-medium no-underline ${linkTone}`} data-testid="sign-in-link">
        Sign in
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.email ?? 'your account'}${unread ? ` (${unread} unread conversation${unread === '1' ? '' : 's'})` : ''}`}
        onClick={() => setOpen(v => !v)}
        className={
          light
            ? 'relative flex size-9 items-center justify-center rounded-full bg-n-accent text-xs font-semibold text-white hover:bg-n-accent-strong'
            : 'relative flex size-9 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80'
        }
      >
        {initials(user.displayName, user.email)}
        {unread ? (
          <span
            aria-hidden
            className={`absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 ${light ? 'border-n-canvas bg-n-danger' : 'border-neutral-950 bg-rose-500'}`}
          />
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className={menuClass}
        >
          <div className={light ? 'border-b border-n-line-soft px-3 py-2' : 'border-b border-white/10 px-3 py-2'}>
            <p className={light ? 'truncate font-medium text-n-ink' : 'truncate font-medium text-white'}>{user.displayName || 'Your account'}</p>
            <p className={light ? 'truncate text-xs text-n-subtle' : 'truncate text-xs text-gray-500'}>{user.email}</p>
          </div>
          <Link role="menuitem" href={MESSAGES_PATH} className={`${itemClass} flex items-center justify-between gap-2`} onClick={() => setOpen(false)}>
            <span>Messages</span>
            {unread ? (
              <span className="rounded-full bg-n-accent px-1.5 text-[11px] leading-[18px] font-semibold text-white tabular-nums">
                {unread}
                <span className="sr-only"> unread</span>
              </span>
            ) : null}
          </Link>
          <Link role="menuitem" href={accountRoutes.business} className={itemClass} onClick={() => setOpen(false)}>
            Your business
          </Link>
          {role ? (
            <Link role="menuitem" href={adminConsoleHref()} className={itemClass} onClick={() => setOpen(false)}>
              Admin console
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={light ? 'block w-full px-3 py-2 text-left text-n-muted hover:bg-n-hover hover:text-n-ink' : 'block w-full px-3 py-2 text-left text-gray-400 hover:bg-white/5 hover:text-gray-200'}
            onClick={() => {
              setOpen(false)
              void signOut().then(() => router.refresh())
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
