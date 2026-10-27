'use client'

/**
 * Manage a Place's QR placements ("Reception", "Bar", "Room 12"). Only
 * registered placements get their own row in the Place stats, and only
 * Nessa admins and the Place's business owners / managers can register
 * them — `managePlaceQrPlacements` checks that on every call; this
 * component only renders.
 *
 * Retiring hides a placement from the QR picker; QRs already printed with it
 * keep counting.
 */

import { useState, type FormEvent } from 'react'

import { accountButtonClass, accountFieldClass } from '@/components/account/account-shell'
import {
  BusinessActionError,
  createQrPlacement,
  restoreQrPlacement,
  retireQrPlacement,
  type QrPlacement,
} from '@/lib/business'
import { QR_PLACEMENT_LABEL_MAX, qrPlacementIdFromLabel } from '@/lib/place-qr'

export function QrPlacementsManager({
  placeId,
  placements,
  limit,
  onChange,
}: {
  placeId: string
  placements: QrPlacement[]
  limit: number
  onChange: (placements: QrPlacement[]) => void
}) {
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showRetired, setShowRetired] = useState(false)

  const active = placements.filter(p => p.active)
  const retired = placements.filter(p => !p.active)
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
    <section aria-label="QR placements" className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">QR placements</p>
        <p className="text-[11px] text-gray-500">
          {active.length}/{limit} active
        </p>
      </div>
      <p className="text-[11px] leading-4 text-gray-500">
        Name each spot where you put a QR (reception, bar, room 12…). Each one gets its own row in the stats. Pick it
        under “QR codes” before downloading.
      </p>

      {active.length === 0 ? (
        <p className="text-xs text-gray-400">No placements yet.</p>
      ) : (
        <ul className="divide-y divide-white/5" aria-label="Active placements">
          {active.map(p => (
            <li key={p.qrId} className="flex items-center justify-between gap-3 py-1.5 text-xs">
              <span className="min-w-0">
                <span className="text-gray-200">{p.label}</span>
                <span className="ml-2 text-[11px] text-gray-500">qr={p.qrId}</span>
              </span>
              <button
                type="button"
                onClick={() => void run(`retire:${p.qrId}`, () => retireQrPlacement(placeId, p.qrId), `Retired “${p.label}”.`)}
                disabled={busy !== null}
                className="shrink-0 text-[11px] text-gray-400 hover:text-gray-200 disabled:opacity-50"
              >
                {busy === `retire:${p.qrId}` ? 'Retiring…' : 'Retire'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={e => void onAdd(e)} className="flex items-end gap-2" noValidate aria-label="Add a placement">
        <label className="block min-w-0 flex-1 text-left text-xs text-gray-400">
          New placement
          <input
            value={label}
            onChange={e => setLabel(e.target.value.slice(0, QR_PLACEMENT_LABEL_MAX))}
            maxLength={QR_PLACEMENT_LABEL_MAX}
            placeholder="Reception"
            autoComplete="off"
            className={accountFieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={busy !== null || !previewId || duplicate || full}
          className={`${accountButtonClass} !w-auto !px-4 !py-2 text-xs`}
        >
          {busy === 'add' ? 'Adding…' : 'Add'}
        </button>
      </form>
      {label.trim() && !previewId ? (
        <p className="text-[11px] text-amber-300">Use letters or numbers, e.g. Reception, Bar or Room 12.</p>
      ) : duplicate ? (
        <p className="text-[11px] text-amber-300">This placement already exists.</p>
      ) : full ? (
        <p className="text-[11px] text-amber-300">Limit reached. Retire a placement first.</p>
      ) : previewId ? (
        <p className="text-[11px] text-gray-500">QR tag: qr={previewId}</p>
      ) : null}

      {retired.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowRetired(v => !v)}
            aria-expanded={showRetired}
            className="text-[11px] text-gray-400 hover:text-gray-200"
          >
            {showRetired ? 'Hide' : 'Show'} retired ({retired.length})
          </button>
          {showRetired ? (
            <ul className="mt-1 divide-y divide-white/5" aria-label="Retired placements">
              {retired.map(p => (
                <li key={p.qrId} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                  <span className="min-w-0 text-gray-500">
                    {p.label} <span className="text-[11px]">qr={p.qrId} · still counted</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void run(`restore:${p.qrId}`, () => restoreQrPlacement(placeId, p.qrId), `Restored “${p.label}”.`)}
                    disabled={busy !== null || full}
                    className="shrink-0 text-[11px] text-violet-400 hover:text-violet-300 disabled:opacity-50"
                  >
                    {busy === `restore:${p.qrId}` ? 'Restoring…' : 'Restore'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
      {notice ? <p role="status" className="text-xs text-emerald-300">{notice}</p> : null}
    </section>
  )
}
