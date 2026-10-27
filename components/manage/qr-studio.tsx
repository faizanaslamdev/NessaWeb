'use client'

/**
 * QR codes for a Place in the dashboards: live preview, what the code opens
 * (Place page or Live chat), the placement it counts as, PNG download and the
 * placement list. Placements (registered `qr=` tags) are managed through
 * `managePlaceQrPlacements` — Nessa admins and the Place's business only;
 * the backend checks every call. The public Place page keeps its plain QR.
 */

import { useRef, useState, type FormEvent } from 'react'
import QRCode from 'react-qr-code'

import { usePlaceStats } from '@/components/business/place-stats-panel'
import { Icon } from '@/components/dash/icons'
import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  Notice,
  Panel,
  PanelHeader,
  Segmented,
  cx,
  fieldClass,
  formatDate,
  labelClass,
} from '@/components/dash/ui'
import { downloadSvgAsPng } from '@/components/place/place-share-qr'
import {
  BusinessActionError,
  createQrPlacement,
  restoreQrPlacement,
  retireQrPlacement,
  type QrPlacement,
} from '@/lib/business'
import { shareUrlWithoutScheme } from '@/lib/chat/format'
import { placeQrFilename, qrPlacementIdFromLabel, QR_PLACEMENT_LABEL_MAX } from '@/lib/place-qr'
import { placeChatOutboundUrl, placeChatPublicUrl, placePublicUrl, placeQrUrl } from '@/lib/place-slug'

const EXPORT_SIZE = 1024

export function QrStudio({
  placeId,
  slug,
  placeName,
  placements,
  limit,
  onPlacementsChange,
  scans,
}: {
  placeId: string
  slug: string | null
  placeName: string
  placements: QrPlacement[] | null
  limit: number
  onPlacementsChange: (placements: QrPlacement[]) => void
  /** Scans per placement (last 30 days), when known. */
  scans?: Record<string, number>
}) {
  const [target, setTarget] = useState<'place' | 'chat'>('place')
  const [qrId, setQrId] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const stats = usePlaceStats(placeId)
  const scans30 = scans ?? (stats.kind === 'ready' ? stats.stats.windows[30].qrCodes : undefined)

  const active = (placements ?? []).filter(p => p.active)
  const selected = active.find(p => p.qrId === qrId) ?? null
  const qrUrl =
    target === 'chat'
      ? placeChatOutboundUrl({ placeId, slug }, { ref: 'qr', qrId: selected?.qrId })
      : placeQrUrl({ placeId, slug }, { qrId: selected?.qrId })
  const displayUrl = target === 'chat' ? placeChatPublicUrl({ placeId, slug }) : placePublicUrl({ placeId, slug })

  const download = async () => {
    const svg = exportRef.current?.querySelector('svg')
    if (!svg) return
    setSaving(true)
    setFeedback(null)
    try {
      const label = [target === 'chat' ? 'chat' : '', selected?.label ?? ''].filter(Boolean).join('-')
      await downloadSvgAsPng(svg, placeQrFilename(placeName, label), EXPORT_SIZE)
      setFeedback({ tone: 'ok', text: 'QR downloaded — 1024 × 1024 PNG, ready to print.' })
    } catch {
      setFeedback({ tone: 'danger', text: 'Could not create the PNG. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Panel aria-labelledby="qr-studio-h">
        <PanelHeader id="qr-studio-h" title="Your QR code" description="Print it for reception, tables or room cards." />
        <div className="px-5 pb-5 max-sm:px-4">
          <div className="flex flex-col items-center rounded-[12px] border border-n-line-soft bg-n-surface-2 px-4 py-6">
            <div className="rounded-xl bg-white p-3 shadow-n-card ring-1 ring-n-line-soft">
              <QRCode value={qrUrl} size={168} bgColor="#FFFFFF" fgColor="#111111" level="M" />
            </div>
            <p className="mt-3 text-center text-sm font-medium text-n-ink">
              {target === 'chat' ? 'Scan to join the live chat' : 'Scan to see this place on Nessa'}
            </p>
            <p className="mt-0.5 max-w-full text-center text-xs break-all text-n-muted">{shareUrlWithoutScheme(displayUrl)}</p>
            {selected ? (
              <Badge tone="accent" className="mt-2">
                Counts as “{selected.label}”
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className={labelClass}>Opens</p>
              <div className="mt-1.5">
                <Segmented
                  label="QR opens"
                  value={target}
                  onChange={setTarget}
                  options={[
                    { value: 'place', label: 'Place page' },
                    { value: 'chat', label: 'Live chat' },
                  ]}
                />
              </div>
            </div>
            <label className={labelClass}>
              Placement
              <select value={selected ? selected.qrId : ''} onChange={e => setQrId(e.target.value)} className={fieldClass}>
                <option value="">General QR (no placement)</option>
                {active.map(p => (
                  <option key={p.qrId} value={p.qrId}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-n-subtle">
                Each placement is counted separately in Stats.
              </span>
            </label>
            {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon="download" onClick={() => void download()} loading={saving}>
                Download PNG
              </Button>
              <CopyButton text={qrUrl} label="Copy link" size="md" />
            </div>
          </div>
          <div ref={exportRef} aria-hidden className="pointer-events-none fixed top-0 opacity-0" style={{ left: -4000 }}>
            <QRCode value={qrUrl} size={EXPORT_SIZE} bgColor="#FFFFFF" fgColor="#111111" level="M" />
          </div>
        </div>
      </Panel>

      <QrPlacementsPanel
        placeId={placeId}
        placements={placements}
        limit={limit}
        onChange={onPlacementsChange}
        scans={scans30}
      />
    </div>
  )
}

export function QrPlacementsPanel({
  placeId,
  placements,
  limit,
  onChange,
  scans,
}: {
  placeId: string
  placements: QrPlacement[] | null
  limit: number
  onChange: (placements: QrPlacement[]) => void
  scans?: Record<string, number>
}) {
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showRetired, setShowRetired] = useState(false)

  const list = placements ?? []
  const active = list.filter(p => p.active)
  const retired = list.filter(p => !p.active)
  const previewId = label.trim() ? qrPlacementIdFromLabel(label) : null
  const duplicate = previewId ? active.some(p => p.qrId === previewId) : false
  const full = active.length >= limit

  const run = async (key: string, action: () => Promise<QrPlacement[]>, done: string) => {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      onChange(await action())
      setNotice(done)
      window.setTimeout(() => setNotice(current => (current === done ? null : current)), 2500)
      return true
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Could not save. Please try again.')
      return false
    } finally {
      setBusy(null)
    }
  }

  const onAdd = async (event: FormEvent) => {
    event.preventDefault()
    if (!previewId || duplicate || full) return
    const name = label.trim()
    if (await run('add', () => createQrPlacement(placeId, name), `Added “${name}”.`)) setLabel('')
  }

  return (
    <Panel aria-label="QR placements">
      <PanelHeader
        title="Placements"
        description="Name each spot where a QR hangs. Each one gets its own row in Stats."
        actions={
          <span className="text-xs text-n-muted tabular-nums">
            {active.length}/{limit} active
          </span>
        }
      />
      <form onSubmit={e => void onAdd(e)} noValidate aria-label="Add a placement" className="px-5 max-sm:px-4">
        <label htmlFor={`qr-new-${placeId}`} className={labelClass}>
          New placement
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={`qr-new-${placeId}`}
            value={label}
            onChange={e => setLabel(e.target.value.slice(0, QR_PLACEMENT_LABEL_MAX))}
            maxLength={QR_PLACEMENT_LABEL_MAX}
            placeholder="Reception, Bar, Room 12…"
            autoComplete="off"
            className={cx(fieldClass, 'mt-0 min-w-0 flex-1')}
          />
          <Button type="submit" variant="primary" icon="plus" loading={busy === 'add'} disabled={busy !== null || !previewId || duplicate || full}>
            Add
          </Button>
        </div>
        <p className="mt-1 min-h-4 text-xs text-n-subtle" aria-live="polite">
          {label.trim() && !previewId ? (
            <span className="text-n-warn">Use letters or numbers, e.g. Reception, Bar or Room 12.</span>
          ) : duplicate ? (
            <span className="text-n-warn">This placement already exists.</span>
          ) : full ? (
            <span className="text-n-warn">Limit reached. Retire a placement first.</span>
          ) : previewId ? (
            <>
              QR tag: <code className="font-mono">qr={previewId}</code>
            </>
          ) : null}
        </p>
      </form>

      <div className="mt-2 px-5 max-sm:px-4">
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {notice ? <Notice tone="ok">{notice}</Notice> : null}
      </div>

      {placements === null ? (
        <p className="px-5 py-4 text-sm text-n-muted max-sm:px-4">Loading placements…</p>
      ) : active.length === 0 ? (
        <EmptyState icon="qr" title="No placements yet" compact>
          Add “Reception” or “Bar” to see which printed QR brings people in.
        </EmptyState>
      ) : (
        <ul className="mt-2 divide-y divide-n-line-soft border-t border-n-line-soft" aria-label="Active placements">
          {active.map(p => (
            <li key={p.qrId} className="flex items-center gap-3 px-5 py-2.5 max-sm:px-4">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-n-sunken text-n-muted">
                <Icon name="qr" size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-n-ink">{p.label}</span>
                <span className="block truncate text-xs text-n-subtle">
                  <code className="font-mono">qr={p.qrId}</code>
                  {p.createdAt ? ` · added ${formatDate(p.createdAt)}` : ''}
                </span>
              </span>
              {scans ? (
                <span className="text-[13px] text-n-muted tabular-nums" title="Last 30 days">
                  {scans[p.qrId] ?? 0} {(scans[p.qrId] ?? 0) === 1 ? 'scan' : 'scans'}
                </span>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void run(`retire:${p.qrId}`, () => retireQrPlacement(placeId, p.qrId), `Retired “${p.label}”.`)}
                disabled={busy !== null}
                loading={busy === `retire:${p.qrId}`}
              >
                Retire
              </Button>
            </li>
          ))}
        </ul>
      )}

      {retired.length > 0 ? (
        <div className="border-t border-n-line-soft px-5 py-3 max-sm:px-4">
          <button
            type="button"
            onClick={() => setShowRetired(v => !v)}
            aria-expanded={showRetired}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-n-muted hover:text-n-ink"
          >
            <Icon name="chevron-down" size={15} className={cx('transition-transform', showRetired ? 'rotate-180' : '')} />
            {showRetired ? 'Hide' : 'Show'} retired ({retired.length})
          </button>
          {showRetired ? (
            <ul className="mt-2 space-y-1" aria-label="Retired placements">
              {retired.map(p => (
                <li key={p.qrId} className="flex items-center justify-between gap-3 py-1 text-[13px]">
                  <span className="min-w-0 text-n-muted">
                    {p.label} <span className="text-xs text-n-subtle">· still counted when scanned</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void run(`restore:${p.qrId}`, () => restoreQrPlacement(placeId, p.qrId), `Restored “${p.label}”.`)}
                    disabled={busy !== null || full}
                    loading={busy === `restore:${p.qrId}`}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="h-3" />
      )}
    </Panel>
  )
}
