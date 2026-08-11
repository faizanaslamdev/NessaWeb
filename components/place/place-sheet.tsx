'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type PlaceSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * Lightweight read-only bottom sheet / modal for Place View All lists.
 */
export function PlaceSheet({
  open,
  title,
  onClose,
  children,
  footer,
}: PlaceSheetProps) {
  const [canPortal, setCanPortal] = useState(false)

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

  useEffect(() => {
    if (!open) {
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !canPortal) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-white/10 bg-[#0c0a12] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="border-t border-white/10 px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
