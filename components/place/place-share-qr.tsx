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
import { placeShareUrl } from '@/lib/constants'
import { isPublicPlaceIdValid } from '@/lib/place-landing'
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

function downloadSvgAsPng(
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
  placeName,
  labels,
}: {
  placeId: string
  placeName: string
  labels?: {
    sharePlace?: string
    showQr?: string
    scanToView?: string
    downloadQr?: string
    downloading?: string
    linkCopied?: string
    couldNotShare?: string
    couldNotCopy?: string
    couldNotShowQr?: string
    couldNotDownloadQr?: string
    qrDownloaded?: string
  }
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [saving, setSaving] = useState(false)
  const exportHostRef = useRef<HTMLDivElement>(null)

  const shareUrl = isPublicPlaceIdValid(placeId) ? placeShareUrl(placeId) : ''

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
      showFeedback({
        kind: 'error',
        text: labels?.couldNotShare ?? 'Could not share this place',
      })
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
          ? { kind: 'ok', text: labels?.linkCopied ?? 'Link copied' }
          : {
              kind: 'error',
              text: labels?.couldNotCopy ?? 'Could not copy link',
            },
      )
    } catch {
      showFeedback({
        kind: 'error',
        text: labels?.couldNotShare ?? 'Could not share this place',
      })
    }
  }

  const onOpenQr = (event: MouseEvent<HTMLButtonElement>) => {
    stopCoverClick(event)
    if (!shareUrl) {
      showFeedback({
        kind: 'error',
        text: labels?.couldNotShowQr ?? 'Could not show QR',
      })
      return
    }
    setQrOpen(true)
  }

  const onDownloadQr = async () => {
    if (!shareUrl) {
      showFeedback({
        kind: 'error',
        text: labels?.couldNotDownloadQr ?? 'Could not download QR',
      })
      return
    }
    const svg = exportHostRef.current?.querySelector('svg')
    if (!svg) {
      showFeedback({
        kind: 'error',
        text: labels?.couldNotDownloadQr ?? 'Could not generate QR',
      })
      return
    }
    setSaving(true)
    try {
      await downloadSvgAsPng(svg, placeQrFilename(placeName), EXPORT_QR_SIZE)
      showFeedback({
        kind: 'ok',
        text: labels?.qrDownloaded ?? 'QR downloaded',
      })
    } catch {
      showFeedback({
        kind: 'error',
        text: labels?.couldNotDownloadQr ?? 'Could not download QR',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-start gap-1.5">
        <CoverIconButton
          label={labels?.sharePlace ?? 'Share place'}
          onClick={onShare}
          disabled={!shareUrl}
        >
          <ShareIcon className="size-4" />
        </CoverIconButton>
        <CoverIconButton
          label={labels?.showQr ?? 'Show QR code'}
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

      <PlaceSheet
        open={qrOpen}
        title={placeName.trim() || 'Place QR'}
        onClose={() => setQrOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => {
              void onDownloadQr()
            }}
            disabled={saving || !shareUrl}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
          >
            {saving ? labels?.downloading ?? 'Downloading…' : labels?.downloadQr ?? 'Download QR'}
          </button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-2xl bg-white p-4">
            {shareUrl ? (
              <QRCode
                value={shareUrl}
                size={200}
                bgColor="#FFFFFF"
                fgColor="#111111"
                level="M"
              />
            ) : (
              <p className="text-sm text-gray-500">QR unavailable</p>
            )}
          </div>
          <p className="text-center text-sm font-semibold text-gray-200">
            {labels?.scanToView ?? 'Scan to view this place on Nessa'}
          </p>
          {shareUrl ? (
            <p className="max-w-full break-all text-center text-xs text-gray-500">
              {shareUrlWithoutScheme(shareUrl)}
            </p>
          ) : null}
          {shareUrl ? (
            <div
              ref={exportHostRef}
              aria-hidden
              className="pointer-events-none fixed top-0 opacity-0"
              style={{ left: -4000 }}
            >
              <QRCode
                value={shareUrl}
                size={EXPORT_QR_SIZE}
                bgColor="#FFFFFF"
                fgColor="#111111"
                level="M"
              />
            </div>
          ) : null}
        </div>
      </PlaceSheet>
    </>
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
