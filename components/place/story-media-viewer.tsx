'use client'

import { useEffect, useCallback, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'

type StoryMediaViewerProps = {
  uris: string[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

/**
 * Read-only fullscreen Story image viewer (lightbox).
 * Keyboard: Escape, ←/→. Touch: horizontal swipe.
 * Remount via `key` when opening a different story/index.
 */
export function StoryMediaViewer({
  uris,
  initialIndex = 0,
  open,
  onClose,
}: StoryMediaViewerProps) {
  const photos = uris.filter(Boolean)
  const clampedInitial = Math.max(
    0,
    Math.min(initialIndex, Math.max(0, photos.length - 1)),
  )
  const [index, setIndex] = useState(clampedInitial)
  const [canPortal, setCanPortal] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setCanPortal(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const go = useCallback(
    (delta: number) => {
      if (photos.length === 0) {
        return
      }
      setIndex(prev => {
        const next = prev + delta
        if (next < 0) {
          return photos.length - 1
        }
        if (next >= photos.length) {
          return 0
        }
        return next
      })
    },
    [photos.length],
  )

  useEffect(() => {
    if (!open) {
      return
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowLeft') {
        go(-1)
      } else if (event.key === 'ArrowRight') {
        go(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, go])

  if (!open || !canPortal || photos.length === 0) {
    return null
  }

  const current = photos[index] ?? photos[0]!

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    const end = event.changedTouches[0]?.clientX
    if (start == null || end == null) {
      return
    }
    const dx = end - start
    if (Math.abs(dx) < 48) {
      return
    }
    go(dx < 0 ? 1 : -1)
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Story photo viewer"
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm text-gray-300">
          {index + 1} / {photos.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          aria-label="Close photo viewer"
        >
          Close
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lg text-white hover:bg-black/70 sm:flex"
            aria-label="Previous photo"
          >
            ‹
          </button>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element -- Firebase download URLs */}
        <img
          src={current}
          alt=""
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />

        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lg text-white hover:bg-black/70 sm:flex"
            aria-label="Next photo"
          >
            ›
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
