'use client'

/**
 * 7 / 30-day Place link stats (visits by source and QR placement, new vs
 * returning, chat joins). Used by the business tools page and the admin
 * Places page; `getBusinessPlaceStats` checks access on the backend
 * (Nessa admins: any Place; owners / managers: their Places).
 */

import { useEffect, useState } from 'react'

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

export function PlaceStatsPanel({ placeId, reloadKey = 0 }: { placeId: string; reloadKey?: number }) {
  const [state, setState] = useState<StatsState>({ kind: 'loading' })
  const [window, setWindow] = useState<PlaceStatsWindow>(7)

  useEffect(() => {
    let cancelled = false
    getBusinessPlaceStats(placeId)
      .then(stats => {
        if (!cancelled) setState({ kind: 'ready', stats })
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            kind: 'error',
            message: e instanceof BusinessActionError ? e.message : 'Could not load stats.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [placeId, reloadKey])

  return (
    <section aria-label="Place stats" className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last {window} days</p>
        <div className="flex gap-1" role="group" aria-label="Stats period">
          {([7, 30] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setWindow(d)}
              aria-pressed={window === d}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                window === d ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {state.kind === 'loading' ? (
        <p className="text-xs text-gray-500">Loading stats…</p>
      ) : state.kind === 'error' ? (
        <p className="text-xs text-red-300">{state.message}</p>
      ) : (
        <StatsBody summary={state.stats.windows[window]} labels={state.stats.qrPlacementLabels ?? {}} />
      )}
    </section>
  )
}

function StatsBody({
  summary,
  labels,
}: {
  summary: BusinessPlaceStats['windows'][PlaceStatsWindow]
  labels: Record<string, string>
}) {
  const tiles = summaryTiles(summary)
  const sources = statRows(summary.sources)
  const placements = placementStatRows(summary, labels)
  const chatSources = statRows(summary.chatJoins.sources)
  const empty = summary.visits === 0 && summary.chatJoins.total === 0

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-2">
        {tiles.map(t => (
          <div key={t.label} className="rounded-lg bg-black/30 px-2.5 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-gray-500">{t.label}</dt>
            <dd className="text-lg font-semibold leading-tight text-white">{t.value}</dd>
            {t.hint ? <dd className="text-[10px] text-gray-500">{t.hint}</dd> : null}
          </div>
        ))}
      </dl>

      {empty ? (
        <p className="text-[11px] text-gray-500">
          No visits yet in this period. Scans of your QR codes and opened links will show up here.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Breakdown title="Visits by source" rows={sources} />
          {placements.length > 0 ? <Breakdown title="QR placements" rows={placements} /> : null}
          {chatSources.length > 0 ? <Breakdown title="Chat joins by source" rows={chatSources} /> : null}
        </div>
      )}
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: { key: string; label: string; count: number; share: number }[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400">{title}</p>
      <ul className="mt-1 space-y-1">
        {rows.map(r => (
          <li key={r.key} className="text-xs">
            <div className="flex items-center justify-between gap-2 text-gray-300">
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 tabular-nums text-gray-400">
                {r.count} · {percentLabel(r.share)}
              </span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-white/5">
              <div className="h-1 rounded-full bg-violet-500/70" style={{ width: `${Math.max(2, Math.round(r.share * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
