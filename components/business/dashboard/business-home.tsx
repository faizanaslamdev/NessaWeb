'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { useBusiness } from '@/components/business/dashboard/business-shell'
import { StatTiles, usePlaceStats } from '@/components/business/place-stats-panel'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon, type IconName } from '@/components/dash/icons'
import {
  Avatar,
  Badge,
  ButtonLink,
  CopyButton,
  EmptyState,
  LoadingBlock,
  Notice,
  Panel,
  PanelHeader,
  Skeleton,
  cx,
} from '@/components/dash/ui'
import { ActivityChart } from '@/components/manage/activity-chart'
import {
  BUSINESS_CATEGORY_LABELS,
  getBusinessTeam,
  listQrPlacements,
  type BusinessCategory,
  type BusinessTeam,
  type QrPlacement,
} from '@/lib/business'
import { nessaCoverUrl } from '@/lib/place-photo'
import { fetchPublicPlaceLanding, type PublicPlaceLanding } from '@/lib/place-landing'
import { placeOutboundUrl, placePublicUrl } from '@/lib/place-slug'

type Step = { key: string; title: string; hint: string; href: string; done: boolean; icon: IconName }

export function BusinessHomeDashboard() {
  const { business, place, href, isOwner } = useBusiness()
  const [placements, setPlacements] = useState<QrPlacement[] | null>(null)
  const [team, setTeam] = useState<BusinessTeam | null>(null)
  const [landing, setLanding] = useState<PublicPlaceLanding | null>(null)
  const stats = usePlaceStats(place.placeId)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacements(null)
    setLanding(null)
    listQrPlacements(place.placeId)
      .then(r => !cancelled && setPlacements(r.placements))
      .catch(() => !cancelled && setPlacements([]))
    fetchPublicPlaceLanding(place.placeId)
      .then(l => !cancelled && setLanding(l))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [place.placeId])

  useEffect(() => {
    let cancelled = false
    getBusinessTeam(business.businessId)
      .then(t => !cancelled && setTeam(t))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [business.businessId])

  const p = business.profile
  const activePlacements = (placements ?? []).filter(x => x.active)
  const hasOwnCover = Boolean(nessaCoverUrl(landing))
  const steps: Step[] = [
    {
      key: 'details',
      title: 'Add your business details',
      hint: 'Description, phone and hours on your verified page',
      href: href('details'),
      done: Boolean(p.description && (p.phone || p.whatsapp || p.website)),
      icon: 'store',
    },
    {
      key: 'welcome',
      title: 'Pin a welcome in your live chat',
      hint: 'The first thing guests read when they join',
      href: href('chat'),
      done: Boolean(place.pinnedText),
      icon: 'chat',
    },
    {
      key: 'photo',
      title: 'Add your cover photo',
      hint: 'Your own photo, on your page and in listings',
      href: href('photos'),
      done: hasOwnCover,
      icon: 'image',
    },
    {
      key: 'wifi',
      title: 'Share your guest Wi-Fi',
      hint: 'Shown on your page, so nobody has to ask',
      href: href('guests'),
      done: place.hasWifi,
      icon: 'wifi',
    },
    {
      key: 'qr',
      title: 'Print your QR codes',
      hint: 'Name a placement for each spot, then download',
      href: href('qr'),
      done: activePlacements.length > 0,
      icon: 'qr',
    },
    ...(isOwner
      ? [
          {
            key: 'team',
            title: 'Invite your front desk',
            hint: 'Managers can help with chat, QR codes and stats',
            href: href('team'),
            done: Boolean(team && (team.members.length > 1 || team.invites.some(i => i.status === 'pending'))),
            icon: 'users' as IconName,
          },
        ]
      : []),
  ]
  const doneCount = steps.filter(s => s.done).length
  const loadingSteps = placements === null || (isOwner && team === null)
  const publicUrl = placePublicUrl({ placeId: place.placeId, slug: place.slug })
  const shareUrl = placeOutboundUrl({ placeId: place.placeId, slug: place.slug })
  const category = p.category ? BUSINESS_CATEGORY_LABELS[p.category as BusinessCategory] : null
  const scans30 = stats.kind === 'ready' ? stats.stats.windows[30].qrCodes : {}
  // NessaChat cover only (dashboards never load Google photos).
  const cover = nessaCoverUrl(landing)
  const coverSmall = nessaCoverUrl(landing, true)

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Home' }]} />

      {/* Place header */}
      <Panel className="overflow-hidden">
        <div className={cx('relative bg-n-sunken', cover ? 'h-28 sm:h-40' : 'h-20 sm:h-24')}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- NessaChat cover (Firebase Storage)
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="n-soft-cover h-full w-full" />
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-5 max-sm:px-4">
          <div className="min-w-0">
            <div className="-mt-8 mb-2 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-n-surface bg-n-surface text-lg font-semibold text-n-accent-strong shadow-n-card">
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- owner-provided https logo
                <img src={p.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-n-accent-soft">{place.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-n-ink sm:text-[26px]">{place.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-n-muted">
              <Badge tone="ok" dot>
                Verified
              </Badge>
              {[category, place.city].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <CopyButton text={shareUrl} label="Copy link" size="md" className="max-sm:flex-1" />
            <ButtonLink href={href('qr')} variant="primary" icon="qr" className="max-sm:flex-1">
              Print QR codes
            </ButtonLink>
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {/* Checklist */}
          {loadingSteps ? (
            <Panel>
              <LoadingBlock rows={4} label="Loading your checklist…" />
            </Panel>
          ) : doneCount < steps.length ? (
            <Panel aria-labelledby="home-setup">
              <PanelHeader
                id="home-setup"
                title="Get ready for guests"
                description="A few minutes now makes your page and chat feel looked after."
                actions={
                  <span className="text-[13px] font-medium text-n-muted tabular-nums">
                    {doneCount} of {steps.length}
                  </span>
                }
              />
              <div className="px-5 max-sm:px-4" aria-hidden>
                <div className="h-1.5 rounded-full bg-n-sunken">
                  <div className="h-1.5 rounded-full bg-n-accent transition-[width]" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
                </div>
              </div>
              <ul className="mt-3 divide-y divide-n-line-soft border-t border-n-line-soft">
                {steps.map(s => (
                  <li key={s.key}>
                    <Link
                      href={s.href}
                      className="flex min-h-16 items-center gap-3 px-5 py-3 text-n-ink no-underline transition-colors hover:bg-n-surface-2 max-sm:px-4"
                    >
                      <span
                        className={cx(
                          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          s.done ? 'bg-n-ok text-white' : 'border-[1.5px] border-n-line-strong',
                        )}
                        aria-hidden
                      >
                        {s.done ? <Icon name="check" size={14} strokeWidth={2.5} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block font-medium', s.done ? 'text-n-muted line-through decoration-n-faint' : '')}>
                          {s.title}
                          <span className="sr-only">{s.done ? ' (done)' : ''}</span>
                        </span>
                        {!s.done ? <span className="block text-[13px] text-n-muted">{s.hint}</span> : null}
                      </span>
                      <Icon name="chevron-right" size={16} className="text-n-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : (
            <Notice tone="ok" title="You’re all set">
              Your page, live chat, Wi-Fi and QR codes are ready for guests.
            </Notice>
          )}

          {/* Activity */}
          <Panel aria-labelledby="home-activity">
            <PanelHeader
              id="home-activity"
              title="Last 30 days"
              actions={
                <ButtonLink href={href('stats')} size="sm" variant="ghost">
                  Where guests come from
                </ButtonLink>
              }
            />
            <div className="space-y-4 px-5 pb-5 max-sm:px-4">
              {stats.kind === 'loading' ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(i => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                  <Skeleton className="h-40" />
                </>
              ) : stats.kind === 'error' ? (
                <Notice tone="danger">{stats.message}</Notice>
              ) : (
                <>
                  <StatTiles stats={stats.stats} days={30} />
                  <ActivityChart data={[...stats.stats.daily].sort((a, b) => a.date.localeCompare(b.date))} height={150} />
                </>
              )}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          {/* Team */}
          <Panel aria-labelledby="home-team">
            <PanelHeader
              id="home-team"
              title="Team"
              actions={
                <ButtonLink href={href('team')} size="sm" variant={isOwner ? 'secondary' : 'ghost'} icon={isOwner ? 'plus' : undefined}>
                  {isOwner ? 'Invite' : 'View'}
                </ButtonLink>
              }
            />
            {!team ? (
              <LoadingBlock rows={2} />
            ) : (
              <ul className="divide-y divide-n-line-soft border-t border-n-line-soft">
                {team.members.slice(0, 4).map(m => (
                  <li key={m.uid} className="flex items-center gap-3 px-5 py-2.5 max-sm:px-4">
                    <Avatar name={m.name || m.email || '?'} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-n-ink">
                        {m.name || m.email}
                        {m.uid === team.you.uid ? <span className="font-normal text-n-muted"> (you)</span> : null}
                      </span>
                      <span className="block text-xs text-n-muted">{m.role === 'owner' ? 'Owner' : 'Manager'}</span>
                    </span>
                  </li>
                ))}
                {team.invites
                  .filter(i => i.status === 'pending')
                  .slice(0, 3)
                  .map(i => (
                    <li key={i.inviteId} className="flex items-center gap-3 px-5 py-2.5 max-sm:px-4">
                      <span
                        aria-hidden
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-n-line-strong text-xs text-n-subtle"
                      >
                        @
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-n-ink">{i.email}</span>
                        <span className="block text-xs text-n-warn">Manager · invitation sent</span>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>

          {/* QR codes */}
          <Panel aria-labelledby="home-qr">
            <PanelHeader
              id="home-qr"
              title="QR codes"
              actions={
                <ButtonLink href={href('qr')} size="sm" variant="ghost">
                  Manage
                </ButtonLink>
              }
            />
            {placements === null ? (
              <LoadingBlock rows={2} />
            ) : activePlacements.length === 0 ? (
              <EmptyState icon="qr" title="No placements yet" compact>
                Name a spot like “Reception” to count each printed QR.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-n-line-soft border-t border-n-line-soft">
                {activePlacements.slice(0, 5).map(q => (
                  <li key={q.qrId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm max-sm:px-4">
                    <span className="truncate font-medium text-n-ink">{q.label}</span>
                    <span className="shrink-0 text-[13px] text-n-muted tabular-nums">{scans30[q.qrId] ?? 0} scans</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Public page preview */}
          <Panel aria-labelledby="home-public">
            <PanelHeader id="home-public" title="Your public page" description="What travelers see on NessaChat." />
            <div className="px-5 pb-5 max-sm:px-4">
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-n-line text-n-ink no-underline transition-colors hover:border-n-line-strong"
              >
                <div className="h-20 bg-n-sunken">
                  {coverSmall ? (
                    // eslint-disable-next-line @next/next/no-img-element -- NessaChat cover (Firebase Storage)
                    <img src={coverSmall} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div aria-hidden className="n-brand-gradient h-full w-full opacity-80" />
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {place.name}
                    <Icon name="shield" size={14} className="text-n-ok" aria-label="Verified" />
                  </p>
                  {p.description ? <p className="line-clamp-2 text-[13px] text-n-muted">{p.description}</p> : null}
                  <p className="text-xs text-n-subtle">
                    {landing ? `${landing.recommenderCount} recommend · ${landing.storyCount} stories` : ' '}
                  </p>
                </div>
              </a>
              <p className="mt-2 flex items-center justify-between gap-2 text-xs text-n-muted">
                <span className="truncate">{publicUrl.replace(/^https?:\/\//, '')}</span>
                <CopyButton text={shareUrl} iconOnly label="Copy link" />
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
