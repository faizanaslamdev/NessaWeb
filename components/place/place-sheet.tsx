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
    <div className="n-site fixed inset-0 z-[90] flex items-end justify-center bg-transparent sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-[rgb(27_26_23/0.45)]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="n-anim-fade relative z-10 flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border border-n-line bg-n-surface text-n-ink shadow-n-pop sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-n-line-soft px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-n-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-n-muted hover:bg-n-hover hover:text-n-ink"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-n-line-soft px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
