'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { accountCardClass } from '@/components/account/account-shell'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes } from '@/lib/account/constants'
import { BusinessActionError, getMyBusinesses, type MyBusiness, type MyClaim, type MyInvite } from '@/lib/business'
import { siteConfig } from '@/lib/constants'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; businesses: MyBusiness[]; claims: MyClaim[]; invites: MyInvite[] }
  | { kind: 'error'; message: string }

export function BusinessHome() {
  const { user, signOut } = useAccountAuth()
  const router = useRouter()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    getMyBusinesses()
      .then(data => {
        if (!cancelled) setState({ kind: 'ready', ...data })
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            kind: 'error',
            message: e instanceof BusinessActionError ? e.message : 'Could not load your businesses.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-md space-y-4">
        <div>
          <p className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-violet-400">
            {siteConfig.name}
          </p>
          <h1 className="text-center text-2xl font-semibold tracking-tight">Your business</h1>
          <p className="mt-1 text-center text-xs text-gray-500">Signed in as {user?.email}</p>
        </div>

        {state.kind === 'loading' ? (
          <p className="text-center text-sm text-gray-400">Loading…</p>
        ) : state.kind === 'error' ? (
          <div className={`${accountCardClass} text-center`}>
            <p className="text-sm text-red-300">{state.message}</p>
          </div>
        ) : (
          <>
            {state.invites.length ? (
              <div className={accountCardClass} aria-label="Invitations">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invitations</p>
                <ul className="space-y-2">
                  {state.invites.map(i => (
                    <li key={i.inviteId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="block text-white">{i.businessName}</span>
                        <span className="block text-xs text-gray-500">
                          Manager · {i.placeCount} {i.placeCount === 1 ? 'place' : 'places'}
                          {i.invitedByEmail ? ` · from ${i.invitedByEmail}` : ''}
                        </span>
                      </span>
                      <Link
                        href={`${accountRoutes.business}/invite/${i.inviteId}`}
                        className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
                      >
                        Review
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {state.businesses.length === 0 && state.invites.length > 0 ? null : state.businesses.length === 0 ? (
              <div className={`${accountCardClass} text-center`}>
                <p className="text-sm text-gray-200">No places yet.</p>
                <p className="text-xs leading-5 text-gray-500">
                  Open your place’s page on {siteConfig.name} and tap “Claim this place”. Nessa
                  verifies every claim by hand, then your official details appear on the page.
                </p>
              </div>
            ) : (
              state.businesses.map(b => (
                <Link
                  key={b.businessId}
                  href={`${accountRoutes.business}/${b.businessId}`}
                  className={`${accountCardClass} block no-underline transition-colors hover:bg-white/[0.08]`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{b.profile.name}</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-gray-300">
                      {b.role === 'owner' ? 'Owner' : 'Manager'}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                    {b.places.map(p => (
                      <li key={p.placeId}>
                        {p.name}
                        {p.city ? ` · ${p.city}` : ''}
                      </li>
                    ))}
                  </ul>
                </Link>
              ))
            )}

            {state.claims.filter(c => c.status !== 'approved').length ? (
              <div className={accountCardClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Claim requests</p>
                <ul className="space-y-2">
                  {state.claims
                    .filter(c => c.status !== 'approved')
                    .map(c => (
                      <li key={c.claimId} className="text-sm">
                        <span className="text-white">{c.businessName}</span>{' '}
                        <span
                          className={
                            c.status === 'pending' ? 'text-amber-300' : 'text-red-300'
                          }
                        >
                          · {c.status === 'pending' ? 'under review' : 'not approved'}
                        </span>
                        {c.reviewNote ? <p className="text-xs text-gray-500">{c.reviewNote}</p> : null}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            void signOut().then(() => router.replace(accountRoutes.signIn))
          }}
          className="w-full text-center text-xs text-gray-500 hover:text-gray-300"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
