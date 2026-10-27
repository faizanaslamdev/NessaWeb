'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes, adminConsoleHref } from '@/lib/account/constants'
import { readMyAdminRole, type AdminRole } from '@/lib/admin'

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

  const linkTone =
    tone === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-950'

  if (loading) {
    return <span aria-hidden className="inline-block h-9 w-16" />
  }

  if (!user) {
    return (
      <Link href={accountRoutes.signIn} className={`text-sm font-medium ${linkTone}`} data-testid="sign-in-link">
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
        aria-label={`Account menu for ${user.email ?? 'your account'}`}
        onClick={() => setOpen(v => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
      >
        {initials(user.displayName, user.email)}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-white/10 bg-neutral-950 py-1 text-sm text-gray-200 shadow-xl"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="truncate font-medium text-white">{user.displayName || 'Your account'}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
          <Link role="menuitem" href={accountRoutes.business} className="block px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
            Your business
          </Link>
          {role ? (
            <Link role="menuitem" href={adminConsoleHref()} className="block px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
              Admin console
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-gray-400 hover:bg-white/5 hover:text-gray-200"
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
