'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { accountButtonClass, accountCardClass } from '@/components/account/account-shell'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes } from '@/lib/account/constants'
import { BusinessActionError, getInvite, respondToInvite, type InviteDetails } from '@/lib/business'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; invite: InviteDetails }
  | { kind: 'error'; message: string; wrongEmail: boolean }
  | { kind: 'declined' }

/** Shows a manager invitation to its invitee and lets them accept or decline. */
export function InviteResponse({ inviteId }: { inviteId: string }) {
  const router = useRouter()
  const { user, signOut } = useAccountAuth()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getInvite(inviteId)
      .then(invite => {
        if (!cancelled) setState({ kind: 'ready', invite })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const err = e instanceof BusinessActionError ? e : null
        setState({
          kind: 'error',
          message: err?.message ?? 'Could not open this invitation.',
          wrongEmail: Boolean(err && /sent to/i.test(err.message)),
        })
      })
    return () => {
      cancelled = true
    }
  }, [inviteId])

  const respond = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline')
    setError(null)
    try {
      const res = await respondToInvite(inviteId, accept)
      if (accept) {
        router.replace(`${accountRoutes.business}/${res.businessId}`)
      } else {
        setState({ kind: 'declined' })
      }
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Something went wrong. Please try again.')
      setBusy(null)
    }
  }

  if (state.kind === 'loading') {
    return <p className="text-center text-sm text-n-muted">Loading…</p>
  }

  if (state.kind === 'declined') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-n-ink-2">You declined this invitation.</p>
        <Link href={accountRoutes.business} className="text-sm text-n-accent-strong hover:text-n-accent">
          Go to your business area
        </Link>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p role="alert" className="text-sm text-n-ink-2">
          {state.message}
        </p>
        {state.wrongEmail ? (
          <>
            <p className="text-xs text-n-subtle">You’re signed in as {user?.email}.</p>
            <button
              type="button"
              className={accountButtonClass}
              onClick={() =>
                void signOut().then(() =>
                  router.replace(`${accountRoutes.signIn}?next=${encodeURIComponent(`${accountRoutes.business}/invite/${inviteId}`)}`),
                )
              }
            >
              Sign in with another account
            </button>
          </>
        ) : null}
      </div>
    )
  }

  const { invite } = state
  const open = invite.status === 'pending'

  return (
    <div className={accountCardClass}>
      <div className="space-y-1 text-center">
        <p className="text-xs uppercase tracking-wide text-n-subtle">You’re invited to manage</p>
        <p className="text-xl font-semibold text-n-ink">{invite.businessName}</p>
        {invite.invitedByEmail ? <p className="text-xs text-n-subtle">Invited by {invite.invitedByEmail}</p> : null}
      </div>
      <div>
        <p className="text-xs text-n-muted">Places</p>
        <ul className="mt-1 space-y-0.5 text-sm text-n-ink-2">
          {invite.places.map(p => (
            <li key={p.placeId}>{p.name}</li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] leading-4 text-n-subtle">
        As a manager you can edit the details, pin chat messages, print QR codes and see stats for these places. The owner can change or
        remove your access at any time.
      </p>
      {open ? (
        <div className="space-y-2">
          <button type="button" disabled={busy !== null} onClick={() => void respond(true)} className={accountButtonClass}>
            {busy === 'accept' ? 'Joining…' : 'Accept invitation'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void respond(false)}
            className="w-full text-center text-xs text-n-muted hover:text-n-ink disabled:opacity-50"
          >
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-n-warn">
          {invite.status === 'expired'
            ? 'This invitation has expired. Ask the owner to send a new one.'
            : invite.status === 'accepted'
              ? 'This invitation was already accepted.'
              : 'This invitation is no longer valid.'}
        </p>
      )}
      {invite.status === 'accepted' ? (
        <Link href={accountRoutes.business} className="block text-center text-sm text-n-accent-strong hover:text-n-accent">
          Go to your business area
        </Link>
      ) : null}
      {error ? (
        <p role="alert" className="text-center text-sm text-n-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
