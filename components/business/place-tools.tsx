'use client'

/**
 * One managed Place on the business page (Phase B): links, QR codes,
 * pre-arrival sharing, the pinned chat welcome and 7/30-day stats.
 *
 * Everything here reuses what the public Place page already has
 * (PlaceQrSheet, PlacePrearrivalCopy, Wi-Fi sheet) plus member-only
 * callables (setPlaceChatPinnedInfo, getBusinessPlaceStats,
 * managePlaceQrPlacements). The backend checks access on every call; this
 * component only renders. QR placements are only available here (and on
 * the admin Places page), never on the public Place page.
 */

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

import { accountButtonClass, accountFieldClass } from '@/components/account/account-shell'
import { PlaceStatsPanel } from '@/components/business/place-stats-panel'
import { PlacePrearrivalCopy } from '@/components/place/place-prearrival-copy'
import { QrPlacementsManager } from '@/components/place/qr-placements-manager'
import { PlaceQrSheet } from '@/components/place/place-share-qr'
import {
  BusinessActionError,
  listQrPlacements,
  setPlaceChatPinnedInfo,
  type MyBusinessPlace,
  type QrPlacement,
} from '@/lib/business'
import { placeChatOutboundUrl, placeOutboundUrl, placePublicUrl } from '@/lib/place-slug'

const PINNED_MAX = 300

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  return false
}

const linkClass = 'text-violet-400 hover:text-violet-300'

export function PlaceTools({
  place,
  onEditWifi,
  onPinnedSaved,
}: {
  place: MyBusinessPlace
  onEditWifi: () => void
  onPinnedSaved: (text: string) => void
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [placements, setPlacements] = useState<QrPlacement[] | null>(null)
  const [placementLimit, setPlacementLimit] = useState(50)
  const [placementsError, setPlacementsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listQrPlacements(place.placeId)
      .then(res => {
        if (cancelled) return
        setPlacements(res.placements)
        setPlacementLimit(res.limit)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setPlacementsError(e instanceof BusinessActionError ? e.message : 'Could not load QR placements.')
      })
    return () => {
      cancelled = true
    }
  }, [place.placeId])

  // Public URLs: what we hand out (outbound, see PLACE_LINKS_USE_LEGACY_ID_PATH)
  // and the clean one people see.
  const placeUrl = placeOutboundUrl({ placeId: place.placeId, slug: place.slug })
  const chatUrl = placeChatOutboundUrl({ placeId: place.placeId, slug: place.slug })
  const displayUrl = placePublicUrl({ placeId: place.placeId, slug: place.slug })

  const copy = async (key: string, text: string) => {
    const ok = await copyText(text)
    setCopied(ok ? key : null)
    setNotice(ok ? null : 'Copy blocked by the browser — select the link instead.')
    window.setTimeout(() => setCopied(current => (current === key ? null : current)), 2000)
  }

  return (
    <li className="space-y-4 rounded-xl border border-white/10 bg-black/30 px-3 py-3">
      <div>
        <p className="text-sm font-semibold text-white">{place.name}</p>
        {place.city ? (
          <p className="text-xs text-gray-400">{[place.city, place.country].filter(Boolean).join(', ')}</p>
        ) : null}
        <p className="mt-1 break-all text-[11px] text-gray-500">{displayUrl.replace(/^https?:\/\//, '')}</p>
      </div>

      {/* Links + tools */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <Link href={placeUrl} className={linkClass} target="_blank" rel="noreferrer">
          Place page
        </Link>
        <button type="button" onClick={() => void copy('place', placeUrl)} className={linkClass}>
          {copied === 'place' ? 'Link copied' : 'Copy Place link'}
        </button>
        <Link href={chatUrl} className={linkClass} target="_blank" rel="noreferrer">
          Live chat
        </Link>
        <button type="button" onClick={() => void copy('chat', chatUrl)} className={linkClass}>
          {copied === 'chat' ? 'Link copied' : 'Copy chat link'}
        </button>
        <button type="button" onClick={() => setQrOpen(true)} className={linkClass}>
          QR codes
        </button>
        <PlacePrearrivalCopy
          placeId={place.placeId}
          slug={place.slug}
          placeName={place.name}
          triggerLabel="Pre-arrival message"
          triggerClassName={linkClass}
        />
        <button type="button" onClick={onEditWifi} className={linkClass}>
          {place.hasWifi ? 'Edit Wi-Fi' : 'Add Wi-Fi'}
        </button>
      </div>
      {notice ? <p className="text-[11px] text-amber-300">{notice}</p> : null}

      <PinnedWelcomeForm place={place} onSaved={onPinnedSaved} />

      {placements ? (
        <QrPlacementsManager
          placeId={place.placeId}
          placements={placements}
          limit={placementLimit}
          onChange={setPlacements}
        />
      ) : placementsError ? (
        <p className="text-xs text-red-300">{placementsError}</p>
      ) : (
        <p className="text-xs text-gray-500">Loading QR placements…</p>
      )}

      <PlaceStatsPanel placeId={place.placeId} />

      <PlaceQrSheet
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        placeId={place.placeId}
        slug={place.slug}
        placeName={place.name}
        placements={(placements ?? []).filter(p => p.active).map(p => ({ qrId: p.qrId, label: p.label }))}
        placementsHint="No placements yet. Add one under QR placements to count each printed QR separately."
      />
    </li>
  )
}

function PinnedWelcomeForm({
  place,
  onSaved,
}: {
  place: MyBusinessPlace
  onSaved: (text: string) => void
}) {
  const [text, setText] = useState(place.pinnedText ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const current = place.pinnedText ?? ''
  const dirty = text.trim() !== current.trim()

  const submit = async (event: FormEvent, clear = false) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const result = await setPlaceChatPinnedInfo(place.placeId, clear ? '' : text)
      setText(result.text)
      setSaved(result.cleared ? 'Pinned message removed.' : 'Pinned in the live chat.')
      onSaved(result.text)
      window.setTimeout(() => setSaved(null), 2500)
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Could not save the pinned message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={e => void submit(e)} className="space-y-2" noValidate>
      <label className="block text-left text-xs text-gray-400">
        Pinned welcome in the live chat
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, PINNED_MAX))}
          maxLength={PINNED_MAX}
          rows={2}
          placeholder="Welcome! Breakfast 7–10, kite lessons at the beach desk. Ask us anything here."
          className={`${accountFieldClass} min-h-16`}
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-600">
          {text.length}/{PINNED_MAX} · shown at the top of the chat for everyone
        </p>
        <div className="flex items-center gap-2">
          {current ? (
            <button
              type="button"
              onClick={e => void submit(e, true)}
              disabled={busy}
              className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
          <button
            type="submit"
            disabled={busy || !dirty || !text.trim()}
            className={`${accountButtonClass} !w-auto !px-4 !py-1.5 text-xs`}
          >
            {busy ? 'Saving…' : 'Pin'}
          </button>
        </div>
      </div>
      {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
      {saved ? <p role="status" className="text-xs text-emerald-300">{saved}</p> : null}
    </form>
  )
}
