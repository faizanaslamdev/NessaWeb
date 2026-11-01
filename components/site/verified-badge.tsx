'use client'

/**
 * Interactive verified badge with an explanation ("toggletip"): hovering
 * with a mouse, keyboard focus or a tap opens a small popover saying what
 * Verified means; Escape, a tap outside or moving away closes it.
 *
 * Only for places where a button is valid. Inside a link (Place cards) use
 * the plain VerifiedMark instead — a button inside <a> is invalid HTML and
 * would steal the card's tap.
 *
 * Screen readers get the button's label ("Verified business") and, once
 * opened, the explanation through a polite live region. The explanation
 * isn't in the server HTML, so a heading's text stays just the name.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { VERIFIED_BODY, VERIFIED_TITLE, VerifiedSeal } from '@/components/site/verified-seal'

const EDGE = 12

export function VerifiedBadge({
  variant = 'pill',
  className = '',
  sealClassName,
}: {
  /** `pill`: seal + "Verified" (section and chat headers). `icon`: seal only (next to a Place's title). */
  variant?: 'pill' | 'icon'
  className?: string
  sealClassName?: string
}) {
  const wrap = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLSpanElement>(null)
  const arrow = useRef<HTMLSpanElement>(null)
  const [hover, setHover] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const leaveTimer = useRef<number | undefined>(undefined)
  const open = hover || focused || pinned

  const close = useCallback(() => {
    window.clearTimeout(leaveTimer.current)
    setHover(false)
    setFocused(false)
    setPinned(false)
  }, [])

  // Escape and taps outside close it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, close])

  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  // Keep the popover inside the viewport (badges sit near the right edge on phones).
  useLayoutEffect(() => {
    const el = pop.current
    if (!open || !el || !button.current || !arrow.current) return
    const b = button.current.getBoundingClientRect()
    const width = el.offsetWidth
    const vw = document.documentElement.clientWidth
    const left = b.left + b.width / 2 - width / 2
    const right = left + width
    const shift = left < EDGE ? EDGE - left : right > vw - EDGE ? vw - EDGE - right : 0
    el.style.translate = `calc(-50% + ${shift}px) 0`
    arrow.current.style.left = `calc(50% - ${shift}px)`
  }, [open])

  const sealClass = sealClassName ?? (variant === 'icon' ? 'size-[0.7em] text-n-accent' : 'size-4 text-n-accent')

  return (
    <span
      ref={wrap}
      className={`relative inline-flex align-baseline ${className}`}
      onPointerEnter={e => {
        if (e.pointerType !== 'mouse') return
        window.clearTimeout(leaveTimer.current)
        setHover(true)
      }}
      onPointerLeave={e => {
        if (e.pointerType !== 'mouse') return
        window.clearTimeout(leaveTimer.current)
        leaveTimer.current = window.setTimeout(() => setHover(false), 120)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label="Verified business"
        aria-expanded={open}
        onClick={() => setPinned(p => !p)}
        onFocus={e => {
          // Keyboard focus opens it; a tap's focus is handled by the click.
          if (e.currentTarget.matches(':focus-visible')) setFocused(true)
        }}
        onBlur={e => {
          if (!wrap.current?.contains(e.relatedTarget as Node | null)) {
            setFocused(false)
            setPinned(false)
          }
        }}
        className={
          variant === 'icon'
            ? // Seal only; the ::before pads the tap area to ~44 px without moving the layout.
              "relative inline-flex cursor-help items-center justify-center rounded-full leading-none text-n-accent outline-offset-2 before:absolute before:-inset-2 before:content-[''] focus-visible:outline-2 focus-visible:outline-n-accent"
            : "relative inline-flex cursor-help items-center gap-1 rounded-full bg-n-accent-soft py-0.5 pr-2 pl-1 text-[12px] leading-[18px] font-semibold tracking-normal text-n-accent-strong outline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:bg-[#e4dffc] focus-visible:outline-2 focus-visible:outline-n-accent"
        }
      >
        <VerifiedSeal className={sealClass} />
        {variant === 'pill' ? <span aria-hidden="true">Verified</span> : null}
      </button>

      {/* Screen readers: the explanation is announced when it opens. */}
      <span className="sr-only" aria-live="polite">
        {open ? `${VERIFIED_TITLE}. ${VERIFIED_BODY}` : ''}
      </span>

      {open ? (
        <span
          ref={pop}
          aria-hidden="true"
          className="absolute top-full left-1/2 z-50 block -translate-x-1/2 w-[min(18rem,calc(100vw-24px))] pt-2 text-left font-sans text-[13px] leading-5 font-normal tracking-normal whitespace-normal normal-case"
        >
          <span
            ref={arrow}
            className="absolute top-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rotate-45 border-t border-l border-n-line bg-n-surface"
          />
          <span className="n-anim-fade block rounded-xl border border-n-line bg-n-surface px-3.5 py-3 text-n-muted shadow-n-pop">
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-n-ink">
              <VerifiedSeal className="size-4 text-n-accent" />
              {VERIFIED_TITLE}
            </span>
            <span className="mt-1 block">{VERIFIED_BODY}</span>
          </span>
        </span>
      ) : null}
    </span>
  )
}
