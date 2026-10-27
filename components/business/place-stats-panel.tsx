'use client'

/**
 * 7 / 30-day Place link stats: headline numbers, daily activity chart,
 * visits by source and by QR placement, chat joins by source. Used by the
 * Business dashboard and the admin console; `getBusinessPlaceStats` checks
 * access on the backend (Nessa admins: any Place; owners / managers: theirs).
 */

import { useEffect, useState } from 'react'

import { Icon } from '@/components/dash/icons'
import { Notice, Panel, PanelHeader, Segmented, Skeleton } from '@/components/dash/ui'
import { ActivityChart } from '@/components/manage/activity-chart'
import {
  BusinessActionError,
  getBusinessPlaceStats,
  type BusinessPlaceStats,
  type PlaceStatsWindow,
} from '@/lib/business'
import { percentLabel, placementStatRows, statRows, summaryTiles } from '@/lib/business-stats'

type StatsState =
  | { kind: 'loading' }
  | { kind: 'ready'; stats: BusinessPlaceStats }
  | { kind: 'error'; message: string }

export function usePlaceStats(placeId: string, reloadKey = 0): StatsState {
  const [state, setState] = useState<StatsState>({ kind: 'loading' })
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ kind: 'loading' })
    getBusinessPlaceStats(placeId)
      .then(stats => {
        if (!cancelled) setState({ kind: 'ready', stats })
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({ kind: 'error', message: e instanceof BusinessActionError ? e.message : 'Could not load stats.' })
      })
    return () => {
      cancelled = true
    }
  }, [placeId, reloadKey])
  return state
}

function sortedDaily(stats: BusinessPlaceStats, days: number) {
  return [...stats.daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-days)
}

/** Full stats panel (dashboards' Stats page, admin Place detail). */
export function PlaceStatsPanel({ placeId, reloadKey = 0 }: { placeId: string; reloadKey?: number }) {
  const state = usePlaceStats(placeId, reloadKey)
  const [days, setDays] = useState<PlaceStatsWindow>(30)

  return (
    <Panel aria-labelledby="stats-h">
      <PanelHeader
        id="stats-h"
        title="Visitors and chat"
        description="Counts of page visits and chat joins. No personal data."
        actions={
          <Segmented
            label="Stats period"
            value={days}
            onChange={setDays}
            size="sm"
            options={[
              { value: 7, label: '7 days' },
              { value: 30, label: '30 days' },
            ]}
          />
        }
      />
      <div className="px-5 pb-5 max-sm:px-4 max-sm:pb-4">
        {state.kind === 'loading' ? (
          <StatsSkeleton />
        ) : state.kind === 'error' ? (
          <Notice tone="danger">{state.message}</Notice>
        ) : (
          <StatsBody stats={state.stats} days={days} />
        )}
      </div>
    </Panel>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading stats" role="status">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-44" />
    </div>
  )
}

export function StatTiles({ stats, days }: { stats: BusinessPlaceStats; days: PlaceStatsWindow }) {
  const tiles = summaryTiles(stats.windows[days])
  return (
    <dl className="grid grid-cols-3 gap-2 sm:gap-3">
      {tiles.map(t => (
        <div key={t.label} className="min-w-0 rounded-[10px] bg-n-surface-2 px-3 py-2.5 ring-1 ring-n-line-soft">
          <dt className="truncate text-xs text-n-muted">{t.label}</dt>
          <dd className="mt-0.5 text-2xl leading-8 font-semibold tracking-[-0.02em] text-n-ink">{t.value.toLocaleString()}</dd>
          {t.hint ? <dd className="truncate text-[11px] text-n-subtle">{t.hint}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

function StatsBody({ stats, days }: { stats: BusinessPlaceStats; days: PlaceStatsWindow }) {
  const summary = stats.windows[days]
  const sources = statRows(summary.sources)
  const placements = placementStatRows(summary, stats.qrPlacementLabels ?? {})
  const chatSources = statRows(summary.chatJoins.sources)
  const empty = summary.visits === 0 && summary.chatJoins.total === 0

  return (
    <div className="space-y-5">
      <StatTiles stats={stats} days={days} />
      <ActivityChart data={sortedDaily(stats, days)} />
      {empty ? (
        <p className="flex items-start gap-2 rounded-[10px] bg-n-surface-2 px-3 py-2.5 text-[13px] text-n-muted">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-n-faint" />
          No visits yet in this period. Scans of your QR codes and opened links will show up here.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sources.length > 0 ? <Breakdown title="Visits by source" rows={sources} /> : null}
          {placements.length > 0 ? <Breakdown title="QR placements" rows={placements} /> : null}
          {chatSources.length > 0 ? <Breakdown title="Chat joins by source" rows={chatSources} color="#0F8C7E" /> : null}
        </div>
      )}
    </div>
  )
}

function Breakdown({
  title,
  rows,
  color = '#5B46E5',
}: {
  title: string
  rows: { key: string; label: string; count: number; share: number }[]
  color?: string
}) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-n-ink">{title}</h3>
      <ul className="mt-2 space-y-2.5">
        {rows.map(r => (
          <li key={r.key} className="text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-n-ink-2">{r.label}</span>
              <span className="shrink-0 text-n-muted tabular-nums">
                {r.count} · {percentLabel(r.share)}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-n-sunken">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.max(2, Math.round(r.share * 100))}%`, background: color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
