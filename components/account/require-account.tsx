'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'

import { accountButtonClass, accountCardClass } from '@/components/account/account-shell'
import { Spinner } from '@/components/dash/ui'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes } from '@/lib/account/constants'

/**
 * Client-side gate for account-only pages (business area, admin console).
 * Redirects guests (no user, or an anonymous Place Chat user) to sign-in and
 * brings them back afterwards. Requires a verified email, since business
 * ownership is granted by email (admin assignment) — without this, someone
 * could register an owner's address first and inherit their Place.
 *
 * This is UX only: every business / admin action is also enforced
 * server-side in Cloud Functions and Firestore rules.
 */
export function RequireAccount({
  children,
  inline = false,
  requireVerifiedEmail = true,
}: {
  children: ReactNode
  /** Inside a page layout (no full-screen frame). */
  inline?: boolean
  /**
   * Business / admin areas need a verified email. Traveler pages (/messages)
   * only need a real account — the messaging callables don't require one.
   */
  requireVerifiedEmail?: boolean
}) {
  const { user, loading, emailVerified, resendVerification, refresh, signOut } = useAccountAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname
      router.replace(`${accountRoutes.signIn}?next=${encodeURIComponent(next || accountRoutes.business)}`)
    }
  }, [loading, user, router, pathname])

  if (loading || !user) {
    return <FullPageLoading inline={inline} />
  }

  if (requireVerifiedEmail && !emailVerified) {
    return (
      <div className={`n-dash flex flex-col items-center justify-center bg-n-canvas px-4 py-12 text-n-ink ${inline ? 'min-h-[360px]' : 'min-h-dvh'}`}>
        <div className={`w-full max-w-[420px] ${accountCardClass} text-center`}>
          <Image src="/logo.png" alt="" width={40} height={40} className="mx-auto h-10 w-10" />
          <h1 className="text-lg font-semibold">Verify your email</h1>
          <p className="text-sm leading-6 text-n-muted">
            We sent a verification link to <span className="font-medium text-n-ink">{user.email}</span>. Open it,
            then come back here.
          </p>
          <button
            type="button"
            onClick={() => {
              void refresh()
            }}
            className={accountButtonClass}
          >
            I’ve verified my email
          </button>
          <div className="flex items-center justify-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => {
                void resendVerification().then(() => setResent(true))
              }}
              className="font-medium text-n-accent-strong hover:underline"
            >
              {resent ? 'Email sent' : 'Resend the email'}
            </button>
            <button
              type="button"
              onClick={() => {
                void signOut()
              }}
              className="text-n-muted hover:text-n-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function FullPageLoading({ label = 'Loading…', inline = false }: { label?: string; inline?: boolean }) {
  return (
    <div className={`n-dash flex flex-col items-center justify-center gap-3 bg-n-canvas text-sm text-n-muted ${inline ? 'min-h-[360px]' : 'min-h-dvh'}`}>
      <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" priority />
      <span className="inline-flex items-center gap-2">
        <Spinner size={14} /> {label}
      </span>
    </div>
  )
}
