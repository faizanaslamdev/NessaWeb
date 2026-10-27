'use client'

/**
 * /business: the signed-in person's businesses, open invitations and claim
 * requests. With exactly one business and nothing else to show, it opens
 * that business's dashboard directly.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Icon } from '@/components/dash/icons'
import { Badge, ButtonLink, EmptyState, LoadingBlock, Notice, Panel, PanelHeader, buttonClass } from '@/components/dash/ui'
import { UserMenu } from '@/components/dash/user-menu'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes, adminConsoleHref } from '@/lib/account/constants'
import { readMyAdminRole } from '@/lib/admin'
import { BusinessActionError, getMyBusinesses, type MyBusiness, type MyClaim, type MyInvite } from '@/lib/business'
import { siteRoutes } from '@/lib/constants'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; businesses: MyBusiness[]; claims: MyClaim[]; invites: MyInvite[] }
  | { kind: 'error'; message: string }

export function BusinessHome() {
  const { user, signOut } = useAccountAuth()
  const router = useRouter()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMyBusinesses()
      .then(data => {
        if (cancelled) return
        const openClaims = data.claims.filter(c => c.status !== 'approved')
        if (data.businesses.length === 1 && data.invites.length === 0 && openClaims.length === 0) {
          router.replace(`${accountRoutes.business}/${encodeURIComponent(data.businesses[0].businessId)}`)
          return
        }
        setState({ kind: 'ready', ...data })
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({ kind: 'error', message: e instanceof BusinessActionError ? e.message : 'Could not load your businesses.' })
      })
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void readMyAdminRole(user.uid).then(r => !cancelled && setIsAdmin(Boolean(r)))
    return () => {
      cancelled = true
    }
  }, [user])

  const email = user?.email ?? ''
  const pendingClaims = state.kind === 'ready' ? state.claims.filter(c => c.status !== 'approved') : []

  return (
    <div className="n-dash min-h-dvh bg-n-canvas text-n-ink antialiased">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-n-line bg-n-surface/90 px-4 backdrop-blur-md sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-n-ink no-underline">
          <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">NessaChat</span>
          <span className="text-[13px] text-n-muted max-sm:hidden">for Business</span>
        </Link>
        <div className="ml-auto">
          <UserMenu
            email={email}
            links={[
              ...(isAdmin ? [{ href: adminConsoleHref(), label: 'Admin console', icon: 'shield' as const }] : []),
              { href: siteRoutes.forBusinesses, label: 'How claiming works', icon: 'info' as const },
            ]}
            onSignOut={() => void signOut().then(() => router.replace(accountRoutes.signIn))}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.025em]">Your businesses</h1>
        <p className="mt-1 text-sm text-n-muted">Signed in as {email}</p>

        <div className="mt-6 space-y-6">
          {state.kind === 'loading' ? (
            <Panel>
              <LoadingBlock rows={3} />
            </Panel>
          ) : state.kind === 'error' ? (
            <Notice tone="danger">{state.message}</Notice>
          ) : (
            <>
              {state.invites.length ? (
                <Panel aria-label="Invitations">
                  <PanelHeader icon="mail" title="Invitations" description="Accept to start managing these places." />
                  <ul className="divide-y divide-n-line-soft border-t border-n-line-soft">
                    {state.invites.map(i => (
                      <li key={i.inviteId} className="flex flex-wrap items-center gap-3 px-5 py-3.5 max-sm:px-4">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{i.businessName}</span>
                          <span className="block text-[13px] text-n-muted">
                            Manager · {i.placeCount} {i.placeCount === 1 ? 'place' : 'places'}
                            {i.invitedByEmail ? ` · from ${i.invitedByEmail}` : ''}
                          </span>
                        </span>
                        <ButtonLink href={`${accountRoutes.business}/invite/${i.inviteId}`} variant="primary" size="sm">
                          Review
                        </ButtonLink>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}

              {state.businesses.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {state.businesses.map(b => (
                    <li key={b.businessId}>
                      <Link
                        href={`${accountRoutes.business}/${b.businessId}`}
                        className="group block h-full rounded-[14px] border border-n-line bg-n-surface p-5 text-n-ink no-underline shadow-n-card transition-colors hover:border-n-line-strong"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-n-accent-soft text-sm font-semibold text-n-accent-strong">
                            {(b.profile.name || 'B').slice(0, 2).toUpperCase()}
                          </span>
                          <Badge tone={b.role === 'owner' ? 'accent' : 'neutral'}>{b.role === 'owner' ? 'Owner' : 'Manager'}</Badge>
                        </div>
                        <p className="mt-3 font-semibold">{b.profile.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[13px] text-n-muted">
                          {b.places.map(p => p.name).join(' · ') || 'No places yet'}
                        </p>
                        <p className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-n-accent-strong">
                          Open dashboard <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : state.invites.length === 0 ? (
                <Panel>
                  <EmptyState
                    icon="store"
                    title="No places yet"
                    action={
                      <Link href={siteRoutes.forBusinesses} className={buttonClass('primary', 'md', 'no-underline')}>
                        How to claim your place
                      </Link>
                    }
                  >
                    Open your place’s page on NessaChat and choose “Claim this place”. Nessa checks every claim by hand, then your
                    dashboard appears here.
                  </EmptyState>
                </Panel>
              ) : null}

              {pendingClaims.length ? (
                <Panel aria-label="Claim requests">
                  <PanelHeader title="Claim requests" />
                  <ul className="divide-y divide-n-line-soft border-t border-n-line-soft">
                    {pendingClaims.map(c => (
                      <li key={c.claimId} className="px-5 py-3 max-sm:px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{c.businessName}</span>
                          <Badge tone={c.status === 'pending' ? 'warn' : 'danger'} dot>
                            {c.status === 'pending' ? 'Under review' : 'Not approved'}
                          </Badge>
                        </div>
                        {c.reviewNote ? <p className="mt-1 text-[13px] text-n-muted">{c.reviewNote}</p> : null}
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
