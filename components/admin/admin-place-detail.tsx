'use client'

/**
 * Admin: one Place — stats, QR codes, live chat settings, business & team,
 * and history in one page. Works for Places without a business (Cumbuco).
 * Every call is authorized by its callable (admin role on the backend).
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import { useAdminHref } from '@/components/admin/admin-shell'
import { AuditList } from '@/components/admin/audit-list'
import { TeamPanel } from '@/components/business/team-panel'
import { PlaceStatsPanel } from '@/components/business/place-stats-panel'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import {
  Badge,
  Button,
  ButtonLink,
  CopyButton,
  EmptyState,
  LoadingBlock,
  Notice,
  Panel,
  PanelHeader,
  Tabs,
} from '@/components/dash/ui'
import { ChatRetentionPanel } from '@/components/manage/chat-retention'
import { QrStudio } from '@/components/manage/qr-studio'
import { getPlaceHistory, type ConsoleAuditItem } from '@/lib/admin-console'
import { readPinnedPlaces, togglePinnedPlace } from '@/lib/admin-pins'
import { BusinessActionError, listQrPlacements, type QrPlacement, type QrPlacementList } from '@/lib/business'
import { fetchPublicPlaceLanding, type PublicPlaceLanding } from '@/lib/place-landing'
import { placeChatOutboundUrl, placeOutboundUrl, placePublicUrl } from '@/lib/place-slug'

type Tab = 'overview' | 'qr' | 'chat' | 'business' | 'history'
const TABS: Tab[] = ['overview', 'qr', 'chat', 'business', 'history']

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; data: QrPlacementList }
  | { kind: 'error'; message: string }

export function AdminPlaceDetail({ placeId }: { placeId: string }) {
  const adminHref = useAdminHref()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [landing, setLanding] = useState<PublicPlaceLanding | null>(null)
  const [tab, setTabState] = useState<Tab>('overview')
  const [pinned, setPinned] = useState(false)
  const [statsKey, setStatsKey] = useState(0)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t && TABS.includes(t)) setTabState(t)
    setPinned(readPinnedPlaces().some(p => p.placeId === placeId))
  }, [placeId])

  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      const url = new URL(window.location.href)
      if (t === 'overview') url.searchParams.delete('tab')
      else url.searchParams.set('tab', t)
      window.history.replaceState(null, '', url.toString())
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false
    listQrPlacements(placeId)
      .then(data => {
        if (!cancelled) setState({ kind: 'ready', data })
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ kind: 'error', message: e instanceof BusinessActionError ? e.message : 'Could not load this place.' })
      })
    fetchPublicPlaceLanding(placeId)
      .then(l => {
        if (!cancelled) setLanding(l)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [placeId])

  const setPlacements = useCallback((placements: QrPlacement[]) => {
    setState(s => (s.kind === 'ready' ? { kind: 'ready', data: { ...s.data, placements } } : s))
    setStatsKey(k => k + 1)
  }, [])

  const placesCrumb = { label: 'Places', href: adminHref('places') }

  if (state.kind === 'loading') {
    return (
      <>
        <ShellTitle crumbs={[placesCrumb, { label: 'Loading…' }]} />
        <Panel>
          <LoadingBlock rows={5} label="Loading place…" />
        </Panel>
      </>
    )
  }
  if (state.kind === 'error' || !state.data.place) {
    return (
      <>
        <ShellTitle crumbs={[placesCrumb, { label: 'Not found' }]} />
        <Panel>
          <EmptyState
            icon="pin"
            title={state.kind === 'error' ? 'Couldn’t open this place' : 'Nessa doesn’t know this place yet'}
            action={<ButtonLink href={adminHref('places')}>Back to places</ButtonLink>}
          >
            {state.kind === 'error' ? state.message : 'Open its page once on nessachat.com, then try again.'}
          </EmptyState>
        </Panel>
      </>
    )
  }

  const { place, placements, limit } = state.data
  const slug = place.slug
  const publicUrl = placePublicUrl({ placeId, slug })
  const pageUrl = placeOutboundUrl({ placeId, slug })
  const chatUrl = placeChatOutboundUrl({ placeId, slug })
  const location = [place.city, place.country].filter(Boolean).join(', ')

  return (
    <div data-place-id={placeId}>
      <ShellTitle crumbs={[placesCrumb, { label: place.name || 'Place' }]} />

      <Panel className="overflow-hidden">
        {landing?.coverImageUrl ? (
          <div className="h-28 bg-n-sunken sm:h-36">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Places photo */}
            <img src={landing.coverImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div aria-hidden className="n-brand-gradient h-2" />
        )}
        <div className="flex flex-wrap items-end justify-between gap-4 p-5 max-sm:p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-n-ink">{place.name || 'Place'}</h1>
              {place.businessId ? (
                <Badge tone="ok" dot>
                  Managed by a business
                </Badge>
              ) : (
                <Badge>No business</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-n-muted">
              {location || 'Place'}
              {landing ? ` · ${landing.recommenderCount} recommended · ${landing.storyCount} stories` : ''}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-1 text-n-ink-2">
                <Icon name="link" size={14} className="text-n-faint" />
                {publicUrl.replace(/^https?:\/\//, '')}
                <CopyButton text={pageUrl} iconOnly label="Copy place link" />
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-n-subtle">
                {placeId}
                <CopyButton text={placeId} iconOnly label="Copy Place ID" />
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              icon="pin"
              variant={pinned ? 'secondary' : 'ghost'}
              aria-pressed={pinned}
              onClick={() => {
                const list = togglePinnedPlace({ placeId, name: place.name, city: place.city, slug })
                setPinned(list.some(p => p.placeId === placeId))
              }}
            >
              {pinned ? 'Pinned' : 'Pin to overview'}
            </Button>
            <ButtonLink href={chatUrl} external icon="chat">
              Live chat
            </ButtonLink>
            <ButtonLink href={pageUrl} external icon="globe" variant="primary">
              Public page
            </ButtonLink>
          </div>
        </div>
      </Panel>

      <div className="mt-5">
        <Tabs
          label="Place sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Stats' },
            { value: 'qr', label: 'QR codes', count: placements.filter(p => p.active).length },
            { value: 'chat', label: 'Live chat' },
            { value: 'business', label: 'Business' },
            { value: 'history', label: 'History' },
          ]}
        />
      </div>

      <div className="mt-5" role="tabpanel">
        {tab === 'overview' ? (
          <PlaceStatsPanel placeId={placeId} reloadKey={statsKey} />
        ) : tab === 'qr' ? (
          <QrStudio
            placeId={placeId}
            slug={slug}
            placeName={place.name}
            placements={placements}
            limit={limit}
            onPlacementsChange={setPlacements}
          />
        ) : tab === 'chat' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ChatRetentionPanel placeId={placeId} />
            <Panel className="self-start">
              <PanelHeader icon="chat" title="The chat" description="Anyone at or near the place can join in their browser — no app needed." />
              <div className="flex flex-wrap gap-2 px-5 pb-5">
                <ButtonLink href={chatUrl} external icon="chat">
                  Open live chat
                </ButtonLink>
                <CopyButton text={chatUrl} label="Copy chat link" size="md" />
              </div>
            </Panel>
          </div>
        ) : tab === 'business' ? (
          place.businessId ? (
            <TeamPanel businessId={place.businessId} />
          ) : (
            <Panel>
              <EmptyState
                icon="store"
                title="No business manages this place"
                action={
                  <ButtonLink href={`${adminHref('business')}?assign=${encodeURIComponent(placeId)}`} icon="plus">
                    Assign an owner
                  </ButtonLink>
                }
              >
                Owners claim their place from its public page. Only Nessa admins see this place’s QR placements and stats until then.
              </EmptyState>
            </Panel>
          )
        ) : (
          <PlaceHistory placeId={placeId} />
        )}
      </div>

      <p className="mt-6 text-center text-xs text-n-subtle">
        <Link href={adminHref('places')} className="text-n-muted hover:text-n-ink">
          ← All places
        </Link>
      </p>
    </div>
  )
}

function PlaceHistory({ placeId }: { placeId: string }) {
  const [items, setItems] = useState<ConsoleAuditItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getPlaceHistory(placeId)
      .then(r => {
        if (!cancelled) setItems(r.items)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the history.')
      })
    return () => {
      cancelled = true
    }
  }, [placeId])
  return (
    <Panel>
      <PanelHeader title="History" description="Changes to this place, its live chat, QR codes and business." />
      {error ? (
        <div className="px-5 pb-5">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : !items ? (
        <LoadingBlock rows={4} />
      ) : items.length === 0 ? (
        <EmptyState icon="log" title="No changes yet" compact />
      ) : (
        <div className="border-t border-n-line-soft">
          <AuditList items={items} linkPlaces={false} />
        </div>
      )}
    </Panel>
  )
}
