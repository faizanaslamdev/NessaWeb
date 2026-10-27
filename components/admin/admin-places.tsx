'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { accountButtonClass, accountCardClass, accountFieldClass } from '@/components/account/account-shell'
import { PlaceStatsPanel } from '@/components/business/place-stats-panel'
import { QrPlacementsManager } from '@/components/place/qr-placements-manager'
import { PlaceQrSheet } from '@/components/place/place-share-qr'
import { parsePlaceRef, resolvePlaceRef } from '@/lib/admin-chats'
import {
  BusinessActionError,
  listQrPlacements,
  type QrPlacement,
  type QrPlacementList,
} from '@/lib/business'
import { placeChatOutboundUrl, placeOutboundUrl, placePublicUrl } from '@/lib/place-slug'

type Loaded = QrPlacementList & { placeId: string }

const linkClass = 'text-violet-300 hover:underline'

function errorText(e: unknown, fallback: string): string {
  return e instanceof BusinessActionError ? e.message : fallback
}

/**
 * Admin page for any Place's QR placements and link stats — including Places
 * without a business (e.g. Cumbuco, a town). Every call goes through
 * `managePlaceQrPlacements` / `getBusinessPlaceStats`, which check the admin
 * role (or business membership) on the backend.
 */
export function AdminPlaces() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [initialRef, setInitialRef] = useState('')

  const open = useCallback(async (placeId: string) => {
    setError(null)
    try {
      const res = await listQrPlacements(placeId)
      setLoaded({ ...res, placeId })
      try {
        const url = new URL(window.location.href)
        url.searchParams.set('place', res.place?.slug || placeId)
        window.history.replaceState(null, '', url.toString())
      } catch {
        // ignore
      }
    } catch (e) {
      setLoaded(null)
      setError(errorText(e, 'Could not load this Place.'))
    }
  }, [])

  // Deep link: /admin/places?place=cumbuco
  useEffect(() => {
    let ref = ''
    try {
      ref = new URLSearchParams(window.location.search).get('place') ?? ''
    } catch {
      ref = ''
    }
    if (!ref) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialRef(ref)
    const parsed = parsePlaceRef(ref)
    if (!parsed) return
    void resolvePlaceRef(parsed).then(placeId => {
      if (placeId) void open(placeId)
      else setError('No Nessa Place uses that link.')
    })
  }, [open])

  const setPlacements = (placements: QrPlacement[]) =>
    setLoaded(current => (current ? { ...current, placements } : current))

  return (
    <div className="space-y-4">
      <FindPlaceForm
        key={initialRef}
        initialValue={initialRef}
        onFound={open}
        onError={text => {
          setLoaded(null)
          setError(text)
        }}
      />

      {error ? (
        <p role="alert" className="text-center text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {loaded && !loaded.place ? (
        <div className={`${accountCardClass} text-center`}>
          <p className="text-sm text-gray-300">Nessa does not know this Place yet. Open its page once, then try again.</p>
        </div>
      ) : null}

      {loaded?.place ? (
        <div className={accountCardClass} data-place-id={loaded.placeId} aria-label={`QR and stats for ${loaded.place.name}`}>
          <div>
            <p className="text-base font-semibold text-white">{loaded.place.name || loaded.placeId}</p>
            <p className="text-[11px] text-gray-500">
              {[loaded.place.city, loaded.place.country].filter(Boolean).join(', ') || 'Place'} · {loaded.placeId}
            </p>
            <p className="mt-1 text-[11px] text-gray-400" data-testid="business-status">
              {loaded.place.businessId
                ? 'Managed by a business — its owners and managers see the same placements and stats.'
                : 'No business manages this Place — only Nessa admins see its placements and stats.'}
            </p>
            <p className="mt-1 break-all text-[11px] text-gray-500">
              {placePublicUrl({ placeId: loaded.placeId, slug: loaded.place.slug }).replace(/^https?:\/\//, '')}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              <a href={placeOutboundUrl({ placeId: loaded.placeId, slug: loaded.place.slug })} target="_blank" rel="noreferrer" className={linkClass}>
                Place page
              </a>
              <a href={placeChatOutboundUrl({ placeId: loaded.placeId, slug: loaded.place.slug })} target="_blank" rel="noreferrer" className={linkClass}>
                Live chat
              </a>
              <button type="button" onClick={() => setQrOpen(true)} className={linkClass}>
                QR codes
              </button>
            </p>
          </div>

          <QrPlacementsManager
            placeId={loaded.placeId}
            placements={loaded.placements}
            limit={loaded.limit}
            onChange={setPlacements}
          />

          <PlaceStatsPanel key={loaded.placeId} placeId={loaded.placeId} reloadKey={loaded.placements.length} />

          <PlaceQrSheet
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            placeId={loaded.placeId}
            slug={loaded.place.slug}
            placeName={loaded.place.name}
            placements={loaded.placements.filter(p => p.active).map(p => ({ qrId: p.qrId, label: p.label }))}
            placementsHint="No placements yet. Add one under QR placements to count each printed QR separately."
          />
        </div>
      ) : null}
    </div>
  )
}

function FindPlaceForm({
  initialValue,
  onFound,
  onError,
}: {
  initialValue: string
  onFound: (placeId: string) => Promise<void>
  onError: (text: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const ref = parsePlaceRef(value)
    if (!ref) {
      onError('Paste a Google Place ID (ChIJ…), a Nessa Place link or its address (e.g. cumbuco).')
      return
    }
    setBusy(true)
    try {
      const placeId = await resolvePlaceRef(ref)
      if (!placeId) {
        onError('No Nessa Place uses that link.')
        return
      }
      await onFound(placeId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={e => void onSubmit(e)} className={accountCardClass} noValidate aria-label="Find a Place">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Find a Place</p>
      <label className="block text-left text-xs text-gray-400">
        Place ID, Nessa link or address
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="cumbuco, ChIJ… or https://www.nessachat.com/places/…"
          autoComplete="off"
          className={accountFieldClass}
        />
      </label>
      <button type="submit" disabled={busy || !value.trim()} className={accountButtonClass}>
        {busy ? 'Looking…' : 'Open QR and stats'}
      </button>
    </form>
  )
}
