'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useAdmin, useAdminHref } from '@/components/admin/admin-shell'
import { AuditList } from '@/components/admin/audit-list'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import {
  Badge,
  ButtonLink,
  EmptyState,
  LoadingBlock,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  Stat,
  Button,
  fieldClass,
  cx,
  timeAgo,
} from '@/components/dash/ui'
import { adminListClaims, BusinessActionError, type AdminClaim } from '@/lib/business'
import { readPinnedPlaces, type PinnedPlace } from '@/lib/admin-pins'

function greeting(d = new Date()): string {
  const h = d.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function AdminOverview() {
  const { displayName, overview, overviewError, refreshOverview } = useAdmin()
  const adminHref = useAdminHref()
  const [claims, setClaims] = useState<AdminClaim[] | null>(null)
  const [claimsError, setClaimsError] = useState<string | null>(null)
  const [pins, setPins] = useState<PinnedPlace[]>([])
  const [today, setToday] = useState('')

  useEffect(() => {
    let cancelled = false
    adminListClaims('pending')
      .then(list => {
        if (!cancelled) setClaims(list)
      })
      .catch((e: unknown) => {
        if (!cancelled) setClaimsError(e instanceof BusinessActionError ? e.message : 'Could not load claims.')
      })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPins(readPinnedPlaces())
    setToday(new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))
    void refreshOverview()
    return () => {
      cancelled = true
    }
  }, [refreshOverview])

  const c = overview?.counts
  const name = displayName?.trim().split(/\s+/)[0] ?? ''

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Overview' }]} />
      <PageHeader
        eyebrow={
          <span suppressHydrationWarning>
            {today}
            {today ? ' · ' : ''}
            <span className="text-n-ok">Production</span>
          </span>
        }
        title={`${greeting()}${name ? `, ${name}` : ''}`}
        actions={<PlaceSearch />}
      />

      {overviewError && !overview ? (
        <Notice tone="warn" className="mb-5" title="Some numbers couldn’t load">
          {overviewError}
        </Notice>
      ) : null}

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Pending claims"
          value={c ? c.pendingClaims : '–'}
          hint={c ? (c.pendingClaims ? 'Waiting for review' : 'All caught up') : ' '}
          href={adminHref('business')}
          icon="briefcase"
          emphasis={Boolean(c?.pendingClaims)}
        />
        <Stat label="Places" value={c ? c.places.toLocaleString() : '–'} hint="Known to Nessa" href={adminHref('places')} icon="pin" />
        <Stat label="Live chat rooms" value={c ? c.rooms.toLocaleString() : '–'} hint="Places with a chat" icon="chat" />
        <Stat
          label="Businesses"
          value={c ? c.businesses.toLocaleString() : '–'}
          hint={c ? `${c.openInvites} open ${c.openInvites === 1 ? 'invitation' : 'invitations'}` : ' '}
          icon="store"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel aria-labelledby="ov-attn">
            <PanelHeader
              id="ov-attn"
              title="Needs your attention"
              description="Claims are checked by hand before anyone can manage a place."
              actions={
                <ButtonLink href={adminHref('business')} size="sm" variant="ghost">
                  All claims
                </ButtonLink>
              }
            />
            {claimsError ? (
              <div className="px-5 pb-5">
                <Notice tone="danger">{claimsError}</Notice>
              </div>
            ) : !claims ? (
              <LoadingBlock rows={3} />
            ) : claims.length === 0 ? (
              <EmptyState icon="check" title="Nothing waiting" compact>
                New business claims will show up here.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-n-line-soft border-t border-n-line-soft">
                {claims.slice(0, 5).map(cl => (
                  <li key={cl.claimId}>
                    <Link
                      href={`${adminHref('business')}#claim-${cl.claimId}`}
                      className="flex min-h-16 items-center gap-3 px-5 py-3 text-n-ink no-underline transition-colors hover:bg-n-surface-2 max-sm:px-4"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{cl.businessName}</span>
                        <span className="block truncate text-[13px] text-n-muted">
                          {cl.email} · {timeAgo(cl.createdAt)}
                        </span>
                      </span>
                      <Badge tone={cl.role === 'manager' ? 'neutral' : 'accent'}>
                        {cl.role === 'manager' ? 'Manager' : 'Owner'}
                      </Badge>
                      <Icon name="chevron-right" size={16} className="text-n-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {c && c.openInvites > 0 ? (
              <p className="rounded-b-[14px] border-t border-n-line-soft bg-n-surface-2 px-5 py-3 text-[13px] text-n-muted max-sm:px-4">
                {c.openInvites} manager {c.openInvites === 1 ? 'invitation is' : 'invitations are'} waiting to be accepted.
              </p>
            ) : null}
          </Panel>

          <Panel aria-labelledby="ov-pins">
            <PanelHeader
              id="ov-pins"
              title="Pinned places"
              description="Pin a place from its page to keep it one click away."
            />
            {pins.length === 0 ? (
              <EmptyState icon="pin" title="No pinned places yet" compact>
                Open a place and choose “Pin to overview”.
              </EmptyState>
            ) : (
              <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2 max-sm:px-4">
                {pins.map(p => (
                  <li key={p.placeId}>
                    <Link
                      href={adminHref(`places/${encodeURIComponent(p.placeId)}`)}
                      className="flex items-center gap-3 rounded-[10px] border border-n-line px-3 py-2.5 text-n-ink no-underline transition-colors hover:border-n-line-strong hover:bg-n-surface-2"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-n-accent-soft text-xs font-semibold text-n-accent-strong">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-n-muted">{p.slug ? `/places/${p.slug}` : p.city || 'Place'}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel aria-labelledby="ov-recent" className="self-start">
          <PanelHeader
            id="ov-recent"
            title="Recent changes"
            description="Every admin and business change is recorded."
            actions={
              <ButtonLink href={adminHref('audit')} size="sm" variant="ghost">
                Audit log
              </ButtonLink>
            }
          />
          {!overview ? (
            overviewError ? (
              <div className="px-5 pb-5">
                <Button size="sm" icon="refresh" onClick={() => void refreshOverview()}>
                  Try again
                </Button>
              </div>
            ) : (
              <LoadingBlock rows={5} />
            )
          ) : overview.audit.length === 0 ? (
            <EmptyState icon="log" title="No changes yet" compact />
          ) : (
            <div className="border-t border-n-line-soft">
              <AuditList items={overview.audit} compact />
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}

function PlaceSearch() {
  const router = useRouter()
  const adminHref = useAdminHref()
  const [q, setQ] = useState('')
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const v = q.trim()
    router.push(v ? `${adminHref('places')}?q=${encodeURIComponent(v)}` : adminHref('places'))
  }
  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full sm:w-72 max-sm:min-w-full">
      <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-n-faint" />
      <label htmlFor="ov-search" className="sr-only">
        Find a place
      </label>
      <input
        id="ov-search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Find a place…"
        autoComplete="off"
        className={cx(fieldClass, 'mt-0 pl-9')}
      />
    </form>
  )
}
