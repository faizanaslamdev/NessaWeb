'use client'

/**
 * Daily page visits and chat joins (two series, one count axis).
 * Validated pair: visits #5B46E5, chat joins #0F8C7E (dataviz validator:
 * CVD ΔE 21, contrast ≥ 3:1 on white). 2px lines, ~10% area wash on visits,
 * crosshair + tooltip on hover/touch, legend + end labels, table view.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

const C_VISITS = '#5B46E5'
const C_JOINS = '#0F8C7E'

export type DailyPoint = { date: string; visits: number; chatJoins: number }

function niceMax(v: number): number {
  if (v <= 4) return 4
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function ActivityChart({ data, height = 180 }: { data: DailyPoint[]; height?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0]?.contentRect.width ?? 600)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pad = { top: 12, right: 12, bottom: 24, left: 32 }
  const innerW = Math.max(10, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(1, ...data.map(d => Math.max(d.visits, d.chatJoins))))
  const ticks = [0, max / 2, max]

  const geo = useMemo(() => {
    const n = data.length
    const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    const y = (v: number) => pad.top + innerH - (v / max) * innerH
    const line = (key: 'visits' | 'chatJoins') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join('')
    const area =
      n > 0
        ? `${line('visits')}L${x(n - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)}L${x(0).toFixed(1)},${(pad.top + innerH).toFixed(1)}Z`
        : ''
    return { x, y, visits: line('visits'), joins: line('chatJoins'), area }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derived from these values
  }, [data, innerW, innerH, max])

  const onMove = (clientX: number) => {
    const el = host.current
    if (!el || data.length === 0) return
    const r = el.getBoundingClientRect()
    const rel = clientX - r.left - pad.left
    const i = Math.round((rel / innerW) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  const last = data[data.length - 1]
  const h = hover !== null ? data[hover] : null
  const tipLeft = hover !== null ? Math.min(Math.max(geo.x(hover), 70), width - 70) : 0

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <ul className="flex items-center gap-4 text-xs text-n-muted" aria-label="Legend">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ background: C_VISITS }} />
            Page visits
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ background: C_JOINS }} />
            Chat joins
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setTable(t => !t)}
          aria-pressed={table}
          className="text-xs font-medium text-n-accent-strong hover:underline"
        >
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {table ? (
        <div className="max-h-64 overflow-auto rounded-[10px] border border-n-line-soft">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-n-surface-2 text-xs text-n-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Day</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Page visits</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Chat joins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-n-line-soft tabular-nums">
              {[...data].reverse().map(d => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5 text-n-ink-2">{shortDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-right text-n-ink">{d.visits}</td>
                  <td className="px-3 py-1.5 text-right text-n-ink">{d.chatJoins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={host}
          className="relative touch-pan-y select-none"
          onMouseMove={e => onMove(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchStart={e => onMove(e.touches[0].clientX)}
          onTouchMove={e => onMove(e.touches[0].clientX)}
          onTouchEnd={() => setHover(null)}
        >
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Daily page visits and chat joins over ${data.length} days${last ? `; latest day ${last.visits} visits and ${last.chatJoins} chat joins` : ''}`}
            className="block"
          >
            {ticks.map(t => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={geo.y(t)} y2={geo.y(t)} stroke="#EFECE7" strokeWidth={1} />
                <text x={pad.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#6F6A62" className="tabular-nums">
                  {Number.isInteger(t) ? t : t.toFixed(1)}
                </text>
              </g>
            ))}
            {data.length > 0 ? (
              <>
                <text x={geo.x(0)} y={height - 6} fontSize={11} fill="#6F6A62">
                  {shortDate(data[0].date)}
                </text>
                <text x={geo.x(data.length - 1)} y={height - 6} fontSize={11} fill="#6F6A62" textAnchor="end">
                  {shortDate(data[data.length - 1].date)}
                </text>
              </>
            ) : null}
            <path d={geo.area} fill={C_VISITS} fillOpacity={0.1} />
            <path d={geo.joins} fill="none" stroke={C_JOINS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={geo.visits} fill="none" stroke={C_VISITS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && h ? (
              <g>
                <line x1={geo.x(hover)} x2={geo.x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#D9D5CE" strokeWidth={1} />
                <circle cx={geo.x(hover)} cy={geo.y(h.chatJoins)} r={4} fill={C_JOINS} stroke="#fff" strokeWidth={2} />
                <circle cx={geo.x(hover)} cy={geo.y(h.visits)} r={4} fill={C_VISITS} stroke="#fff" strokeWidth={2} />
              </g>
            ) : last ? (
              <g>
                <circle cx={geo.x(data.length - 1)} cy={geo.y(last.chatJoins)} r={4} fill={C_JOINS} stroke="#fff" strokeWidth={2} />
                <circle cx={geo.x(data.length - 1)} cy={geo.y(last.visits)} r={4} fill={C_VISITS} stroke="#fff" strokeWidth={2} />
              </g>
            ) : null}
          </svg>
          {hover !== null && h ? (
            <div
              role="status"
              style={{ left: tipLeft, top: 0 }}
              className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-n-line bg-n-surface px-2.5 py-1.5 text-xs shadow-n-pop"
            >
              <p className="font-medium text-n-ink">{shortDate(h.date)}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-n-ink-2">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: C_VISITS }} />
                {h.visits} page {h.visits === 1 ? 'visit' : 'visits'}
              </p>
              <p className="flex items-center gap-1.5 text-n-ink-2">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: C_JOINS }} />
                {h.chatJoins} chat {h.chatJoins === 1 ? 'join' : 'joins'}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
