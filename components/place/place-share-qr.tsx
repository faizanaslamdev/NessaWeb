'use client'

import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import QRCode from 'react-qr-code'

import { PlaceSheet } from '@/components/place/place-sheet'
import { shareUrlWithoutScheme } from '@/lib/chat/format'
import { isPublicPlaceIdValid } from '@/lib/place-landing'
import {
  placeChatOutboundUrl,
  placeChatPublicUrl,
  placeOutboundUrl,
  placePublicUrl,
  placeQrUrl,
} from '@/lib/place-slug'
import {
  buildPlaceShareMessage,
  placeQrFilename,
} from '@/lib/place-qr'

const EXPORT_QR_SIZE = 1024

type Feedback = { kind: 'ok' | 'error'; text: string }

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }

  try {
    if (typeof document === 'undefined') {
      return false
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  size: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const serialized = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([serialized], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const objectUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('canvas'))
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size, size)
        const quiet = Math.round(size * 0.08)
        ctx.drawImage(img, quiet, quiet, size - quiet * 2, size - quiet * 2)
        canvas.toBlob(png => {
          URL.revokeObjectURL(objectUrl)
          if (!png) {
            reject(new Error('blob'))
            return
          }
          const href = URL.createObjectURL(png)
          const a = document.createElement('a')
          a.href = href
          a.download = filename
          a.rel = 'noopener'
          document.body.appendChild(a)
          a.click()
          a.remove()
          window.setTimeout(() => URL.revokeObjectURL(href), 1500)
          resolve()
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('image'))
    }
    img.src = objectUrl
  })
}

export function PlaceCoverShareQr({
  placeId,
  slug,
  placeName,
  variant = 'overlay',
}: {
  placeId: string
  /** Canonical slug; QR + share use the clean `/places/{slug}` URL when set. */
  slug?: string | null
  placeName: string
  /** 'overlay': round buttons on the cover photo; 'buttons': labelled buttons in a toolbar. */
  variant?: 'overlay' | 'buttons'
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const placeIdValid = isPublicPlaceIdValid(placeId)
  // Share / Copy Link and QR use the outbound URL — temporarily the legacy id
  // path so existing Android app installs open the right Place (see
  // PLACE_LINKS_USE_LEGACY_ID_PATH); browsers get a 308 to the slug page.
  const shareUrl = placeIdValid ? placeOutboundUrl({ placeId, slug }) : ''

  const showFeedback = useCallback((next: Feedback) => {
    setFeedback(next)
    window.setTimeout(() => {
      setFeedback(current => (current === next ? null : current))
    }, 2200)
  }, [])

  const stopCoverClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const onShare = async (event: MouseEvent<HTMLButtonElement>) => {
    stopCoverClick(event)
    if (!shareUrl) {
      showFeedback({ kind: 'error', text: 'Could not share this place' })
      return
    }
    const title = placeName.trim() || 'Nessa place'
    const text = buildPlaceShareMessage(placeName)
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({ title, text, url: shareUrl })
        return
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        return
      }
    }
    try {
      const ok = await copyText(shareUrl)
      showFeedback(
        ok
          ? { kind: 'ok', text: 'Link copied' }
          : { kind: 'error', text: 'Could not copy link' },
      )
    } catch {
      showFeedback({ kind: 'error', text: 'Could not share this place' })
    }
  }

  const onOpenQr = (event: MouseEvent<HTMLButtonElement>) => {
    stopCoverClick(event)
    if (!shareUrl) {
      showFeedback({ kind: 'error', text: 'Could not show QR' })
      return
    }
    setQrOpen(true)
  }

  if (variant === 'buttons') {
    const btn =
      'inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-n-line-strong bg-n-surface px-3 text-[13px] font-semibold text-n-ink shadow-n-card transition-colors hover:bg-n-hover disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-3.5 sm:text-[14px]'
    return (
      <>
        <button type="button" className={btn} onClick={onShare} disabled={!shareUrl}>
          <ShareIcon className="size-4" />
          Share
        </button>
        <button type="button" className={btn} onClick={onOpenQr} disabled={!shareUrl}>
          <QrIcon className="size-4" />
          QR code
        </button>
        {feedback ? (
          <span
            role="status"
            aria-live="polite"
            className={`self-center text-[13px] font-medium ${feedback.kind === 'ok' ? 'text-n-ok' : 'text-n-danger'}`}
          >
            {feedback.text}
          </span>
        ) : null}
        <PlaceQrSheet
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          placeId={placeId}
          slug={slug}
          placeName={placeName}
          onFeedback={showFeedback}
        />
      </>
    )
  }

  return (
    <>
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-start gap-1.5">
        <CoverIconButton
          label="Share place"
          onClick={onShare}
          disabled={!shareUrl}
        >
          <ShareIcon className="size-4" />
        </CoverIconButton>
        <CoverIconButton
          label="Show QR code"
          onClick={onOpenQr}
          disabled={!shareUrl}
        >
          <QrIcon className="size-4" />
        </CoverIconButton>
      </div>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md ${
            feedback.kind === 'ok'
              ? 'bg-black/55 text-white'
              : 'bg-red-950/80 text-red-100'
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <PlaceQrSheet
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        placeId={placeId}
        slug={slug}
        placeName={placeName}
        onFeedback={showFeedback}
      />
    </>
  )
}

/** A registered QR placement the sheet can tag a QR with (`qr=<id>`). */
export type QrPlacementChoice = { qrId: string; label: string }

/**
 * QR sheet for a Place: Place-page or Live-chat target and PNG download.
 *
 * - Public Place page (anyone): plain QR, no placement.
 * - Business tools / admin Places page: pass `placements` (the Place's
 *   active registered placements) to tag the QR with one (`qr=<id>`). Only
 *   registered placements get their own row in the stats (the backend
 *   ignores any other tag), so there is no free-text field.
 */
export function PlaceQrSheet({
  open,
  onClose,
  placeId,
  slug,
  placeName,
  onFeedback,
  placements,
  placementsHint,
}: {
  open: boolean
  onClose: () => void
  placeId: string
  slug?: string | null
  placeName: string
  onFeedback?: (feedback: Feedback) => void
  /** Registered active placements; omit for the public (plain) QR. */
  placements?: QrPlacementChoice[]
  /** Shown when `placements` is empty (e.g. where to add one). */
  placementsHint?: string
}) {
  const [saving, setSaving] = useState(false)
  const [localFeedback, setLocalFeedback] = useState<Feedback | null>(null)
  const exportHostRef = useRef<HTMLDivElement>(null)
  // Selected registered placement ('' = general QR, no placement tag).
  const [selectedQrId, setSelectedQrId] = useState('')
  // Which page the QR opens: the Place page or straight into Place Chat.
  const [qrTarget, setQrTarget] = useState<'place' | 'chat'>('place')
  const selected = placements?.find(p => p.qrId === selectedQrId) ?? null
  const qrId = selected?.qrId

  const placeIdValid = isPublicPlaceIdValid(placeId)
  const shareUrl = placeIdValid ? placeOutboundUrl({ placeId, slug }) : ''
  // Tagged so QR scans are attributed (stripped after counting).
  const qrUrl = !placeIdValid
    ? ''
    : qrTarget === 'chat'
      ? placeChatOutboundUrl({ placeId, slug }, { ref: 'qr', qrId })
      : placeQrUrl({ placeId, slug }, { qrId })
  // What people see: always the clean canonical URL of what the QR opens —
  // the Place page, or its Place Chat (`/places/{slug}/chat`).
  const displayUrl = !placeIdValid
    ? ''
    : qrTarget === 'chat'
      ? placeChatPublicUrl({ placeId, slug })
      : placePublicUrl({ placeId, slug })

  const feedback = useCallback(
    (next: Feedback) => {
      if (onFeedback) {
        onFeedback(next)
        return
      }
      setLocalFeedback(next)
      window.setTimeout(() => {
        setLocalFeedback(current => (current === next ? null : current))
      }, 2200)
    },
    [onFeedback],
  )

  const onDownloadQr = async () => {
    if (!shareUrl) {
      feedback({ kind: 'error', text: 'Could not download QR' })
      return
    }
    const svg = exportHostRef.current?.querySelector('svg')
    if (!svg) {
      feedback({ kind: 'error', text: 'Could not generate QR' })
      return
    }
    setSaving(true)
    try {
      const fileLabel = [qrTarget === 'chat' ? 'chat' : '', selected?.label ?? '']
        .filter(Boolean)
        .join('-')
      await downloadSvgAsPng(svg, placeQrFilename(placeName, fileLabel), EXPORT_QR_SIZE)
      feedback({ kind: 'ok', text: 'QR downloaded' })
    } catch {
      feedback({ kind: 'error', text: 'Could not download QR' })
    } finally {
      setSaving(false)
    }
  }

  return (
      <PlaceSheet
        open={open}
        title={placeName.trim() || 'Place QR'}
        onClose={onClose}
        footer={
          <button
            type="button"
            onClick={() => {
              void onDownloadQr()
            }}
            disabled={saving || !shareUrl}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-n-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-n-accent-strong disabled:opacity-50"
          >
            {saving ? 'Downloading…' : 'Download QR'}
          </button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2">
          {localFeedback ? (
            <p role="status" className={`text-xs font-semibold ${localFeedback.kind === 'ok' ? 'text-n-ok' : 'text-n-danger'}`}>
              {localFeedback.text}
            </p>
          ) : null}
          <div className="rounded-2xl border border-n-line bg-white p-4">
            {shareUrl ? (
              <QRCode
                value={qrUrl}
                size={200}
                bgColor="#FFFFFF"
                fgColor="#111111"
                level="M"
              />
            ) : (
              <p className="text-sm text-gray-500">QR unavailable</p>
            )}
          </div>
          <p className="text-center text-sm font-semibold text-n-ink">
            {qrTarget === 'chat'
              ? 'Scan to join the live chat on Nessa'
              : 'Scan to view this place on Nessa'}
          </p>
          {shareUrl ? (
            <p className="max-w-full break-all text-center text-xs text-n-subtle">
              {shareUrlWithoutScheme(displayUrl)}
            </p>
          ) : null}

          <div className="mt-1 w-full space-y-2 rounded-xl border border-n-line bg-n-surface-2 p-3 text-left">
            <div className="flex gap-2" role="group" aria-label="QR opens">
              {(['place', 'chat'] as const).map(target => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setQrTarget(target)}
                  aria-pressed={qrTarget === target}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    qrTarget === target
                      ? 'bg-n-accent text-white'
                      : 'bg-n-surface text-n-ink-2 ring-1 ring-n-line hover:bg-n-hover'
                  }`}
                >
                  {target === 'place' ? 'Place page' : 'Live chat'}
                </button>
              ))}
            </div>
            {placements ? (
              placements.length > 0 ? (
                <label className="block text-xs text-n-muted">
                  Placement (optional)
                  <select
                    value={selected ? selected.qrId : ''}
                    onChange={event => setSelectedQrId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-n-line-strong bg-n-surface px-3 py-2 text-sm text-n-ink focus:border-n-accent focus:outline-none"
                  >
                    <option value="">No placement (general QR)</option>
                    {placements.map(p => (
                      <option key={p.qrId} value={p.qrId}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] text-n-subtle">
                    Each placement is counted separately in the Place’s stats.
                  </span>
                </label>
              ) : (
                <p className="text-[11px] text-n-subtle">
                  {placementsHint ?? 'No placements yet. Add one to count each printed QR separately.'}
                </p>
              )
            ) : null}
          </div>
          {shareUrl ? (
            <div
              ref={exportHostRef}
              aria-hidden
              className="pointer-events-none fixed top-0 opacity-0"
              style={{ left: -4000 }}
            >
              <QRCode
                value={qrUrl}
                size={EXPORT_QR_SIZE}
                bgColor="#FFFFFF"
                fgColor="#111111"
                level="M"
              />
            </div>
          ) : null}
        </div>
      </PlaceSheet>
  )
}

function CoverIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 active:bg-black/50 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m16 6-4-4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2v13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function QrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        width="5"
        height="5"
        x="3"
        y="3"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        width="5"
        height="5"
        x="16"
        y="3"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        width="5"
        height="5"
        x="3"
        y="16"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
