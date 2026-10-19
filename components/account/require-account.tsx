'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { accountButtonClass, accountCardClass } from '@/components/account/account-shell'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes } from '@/lib/account/constants'

/**
 * Client-side gate for account-only pages (business area). Redirects guests
 * (no user, or an anonymous Place Chat user) to sign-in and brings them back
 * afterwards. Requires a verified email, since business ownership is granted
 * by email (admin assignment) — without this, someone could register an
 * owner's address first and inherit their Place.
 *
 * This is UX only: every business action is also enforced server-side in
 * Cloud Functions (membership checks) and Firestore rules.
 */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { user, loading, emailVerified, resendVerification, refresh, signOut } = useAccountAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`${accountRoutes.signIn}?next=${encodeURIComponent(pathname || accountRoutes.business)}`)
    }
  }, [loading, user, router, pathname])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-gray-400">
        Loading…
      </div>
    )
  }

  if (!emailVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12 text-white">
        <div className={`w-full max-w-md ${accountCardClass} text-center`}>
          <h1 className="text-lg font-semibold">Verify your email</h1>
          <p className="text-sm text-gray-300">
            We sent a verification link to <span className="text-white">{user.email}</span>.
            Open it, then come back here.
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
          <button
            type="button"
            onClick={() => {
              void resendVerification()
            }}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            Resend the email
          </button>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="block w-full text-xs text-gray-500 hover:text-gray-300"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
