'use client'

/**
 * Signed-in parts of the public site header, loaded lazily by
 * site-header.tsx (they pull in Firebase Auth / Firestore).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useCustomerThreadsSummary } from '@/components/messages/customer-threads-store'
import { Icon } from '@/components/dash/icons'
import { siteButtonClass } from '@/components/site/ui'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes, adminConsoleHref } from '@/lib/account/constants'
import { readMyAdminRole } from '@/lib/admin'
import { MESSAGES_PATH, customerUnreadLabel } from '@/lib/customer-messages'

/** The phone menu's account block: who is signed in, Messages, business / admin, sign in / out. */
export function MobileMenuAccount({ onClose }: { onClose: () => void }) {
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
    <div className="space-y-2">
      {loading ? null : user ? (
        <>
          <p className="truncate text-[13px] text-n-muted">Signed in as {user.email}</p>
          <MobileMessagesLink uid={user.uid} onClose={onClose} />
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
  )
}

function MobileMessagesLink({ uid, onClose }: { uid: string; onClose: () => void }) {
  const unread = customerUnreadLabel(useCustomerThreadsSummary(uid).unread)
  return (
    <Link href={MESSAGES_PATH} onClick={onClose} className={siteButtonClass('secondary', 'md', 'w-full justify-between')}>
      <span className="inline-flex items-center gap-2">
        <Icon name="chat" size={18} />
        Messages
      </span>
      {unread ? (
        <span className="rounded-full bg-n-accent px-2 text-[12px] leading-5 font-semibold text-white tabular-nums">
          {unread}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </Link>
  )
}

/** Unread business messages, on the phone menu button. */
export function MenuUnreadDot() {
  const { user } = useAccountAuth()
  const unread = useCustomerThreadsSummary(user?.uid).unread
  if (!unread) return null
  return (
    <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-n-canvas bg-n-danger">
      <span className="sr-only">Unread messages</span>
    </span>
  )
}
