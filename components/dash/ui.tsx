'use client'

/**
 * Dashboard primitives (admin + business). Light theme tokens from
 * globals.css (`n-*`). Plain React + Tailwind; no UI dependency.
 */

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* ───────────── Form controls ───────────── */

export const fieldClass =
  'mt-1.5 block w-full rounded-[10px] border border-n-line-strong bg-n-surface px-3 py-2 text-[15px] text-n-ink shadow-n-card outline-none transition-colors placeholder:text-n-faint hover:border-n-faint focus:border-n-accent focus:ring-3 focus:ring-n-accent/15 disabled:bg-n-sunken disabled:text-n-subtle sm:text-sm'

export const labelClass = 'block text-left text-[13px] font-medium text-n-ink-2'

export const hintClass = 'mt-1 block text-xs font-normal text-n-subtle'

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx(labelClass, className)}>
      {label}
      {children}
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  )
}

/* ───────────── Buttons ───────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet-danger'
type Size = 'sm' | 'md' | 'lg'

const variantClass: Record<Variant, string> = {
  primary:
    'bg-n-accent text-white shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_1px_2px_rgb(74_54_201/0.35)] hover:bg-n-accent-strong',
  secondary: 'border border-n-line-strong bg-n-surface text-n-ink shadow-n-card hover:bg-n-hover',
  ghost: 'text-n-ink-2 hover:bg-n-hover hover:text-n-ink',
  danger: 'bg-n-danger text-white hover:bg-[#9a1d13]',
  'quiet-danger': 'text-n-danger hover:bg-n-danger-soft',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-[13px]',
  md: 'h-10 gap-2 rounded-[10px] px-3.5 text-sm max-md:h-11',
  lg: 'h-11 gap-2 rounded-xl px-4 text-[15px]',
}

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra?: string): string {
  return cx(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50',
    variantClass[variant],
    sizeClass[size],
    extra,
  )
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: IconName; loading?: boolean }
>(function Button({ variant = 'secondary', size = 'md', icon, loading, className, children, type, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </button>
  )
})

export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  icon,
  external,
  className,
  children,
}: {
  href: string
  variant?: Variant
  size?: Size
  icon?: IconName
  external?: boolean
  className?: string
  children: ReactNode
}) {
  const cls = buttonClass(variant, size, cx('no-underline', className))
  const inner = (
    <>
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
      {external ? <Icon name="external" size={13} className="opacity-60" /> : null}
    </>
  )
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  className,
  size = 36,
  ...rest
}: {
  icon: IconName
  label: string
  onClick?: () => void
  className?: string
  size?: number
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-[10px] text-n-muted transition-colors hover:bg-n-hover hover:text-n-ink max-md:min-h-11 max-md:min-w-11',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={19} />
    </button>
  )
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cx('animate-spin', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ───────────── Surfaces ───────────── */

export function Panel({
  children,
  className,
  as: As = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'form' | 'article'
} & Record<string, unknown>) {
  return (
    <As
      className={cx('rounded-[14px] border border-n-line bg-n-surface shadow-n-card', className)}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </As>
  )
}

export function PanelHeader({
  title,
  description,
  actions,
  icon,
  id,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  icon?: IconName
  id?: string
  className?: string
}) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3 max-sm:px-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-n-sunken text-n-ink-2">
            <Icon name={icon} size={17} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-n-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-[13px] leading-5 text-n-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-5 pb-5 max-sm:px-4 max-sm:pb-4', className)}>{children}</div>
}

export function PanelFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center justify-between gap-3 rounded-b-[14px] border-t border-n-line-soft bg-n-surface-2 px-5 py-3 max-sm:px-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ───────────── Page header ───────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 max-sm:mb-5">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[13px] text-n-muted">{eyebrow}</p> : null}
        <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.025em] text-n-ink max-sm:text-[22px] max-sm:leading-7">
          {title}
        </h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-n-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div> : null}
    </div>
  )
}

/* ───────────── Small pieces ───────────── */

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-n-sunken text-n-ink-2',
  accent: 'bg-n-accent-soft text-n-accent-strong',
  ok: 'bg-n-ok-soft text-n-ok',
  warn: 'bg-n-warn-soft text-n-warn',
  danger: 'bg-n-danger-soft text-n-danger',
}

export function Badge({
  tone = 'neutral',
  children,
  dot,
  className,
}: {
  tone?: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        toneClass[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

export function Notice({
  tone = 'neutral',
  children,
  title,
  className,
  action,
}: {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  className?: string
  action?: ReactNode
}) {
  const icon: IconName = tone === 'ok' ? 'check' : tone === 'warn' || tone === 'danger' ? 'alert' : 'info'
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[13px] leading-5',
        toneClass[tone],
        className,
      )}
    >
      <Icon name={icon} size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  href,
  icon,
  emphasis,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  href?: string
  icon?: IconName
  emphasis?: boolean
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-n-muted">{label}</p>
        {icon ? <Icon name={icon} size={16} className="text-n-faint" /> : null}
      </div>
      <p
        className={cx(
          'mt-1 text-[28px] leading-9 font-semibold tracking-[-0.02em] max-sm:text-2xl',
          emphasis ? 'text-n-accent-strong' : 'text-n-ink',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-n-subtle">{hint}</p> : null}
    </>
  )
  const cls = 'block rounded-[14px] border border-n-line bg-n-surface p-4 shadow-n-card'
  return href ? (
    <Link href={href} className={cx(cls, 'no-underline transition-colors hover:border-n-line-strong hover:bg-n-surface-2')}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

export function EmptyState({
  icon = 'inbox',
  title,
  children,
  action,
  compact,
}: {
  icon?: IconName
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'px-4 py-6' : 'px-6 py-10')}>
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-n-sunken text-n-muted">
        <Icon name={icon} size={19} />
      </span>
      <p className="text-sm font-semibold text-n-ink">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-[13px] leading-5 text-n-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('n-skeleton rounded-md', className)} />
}

export function LoadingBlock({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="space-y-2.5 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cx('h-4', i % 3 === 2 ? 'w-2/5' : i % 2 ? 'w-3/4' : 'w-full')} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-[10px] bg-n-sunken p-0.5">
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px] max-md:py-2',
            value === o.value ? 'bg-n-surface text-n-ink shadow-[0_1px_2px_rgb(27_26_23/0.1)]' : 'text-n-muted hover:text-n-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
  label,
}: {
  value: T
  tabs: { value: T; label: string; count?: number | null }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-1 border-b border-n-line">
        {tabs.map(t => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={cx(
              '-mb-px inline-flex h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors',
              value === t.value ? 'border-n-accent text-n-ink' : 'border-transparent text-n-muted hover:text-n-ink',
            )}
          >
            {t.label}
            {typeof t.count === 'number' ? (
              <span className="rounded-full bg-n-sunken px-1.5 text-xs leading-5 text-n-muted tabular-nums">{t.count}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-n-accent-soft font-semibold text-n-accent-strong',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

export function initials(name: string): string {
  const base = name.includes('@') ? name.split('@')[0] : name
  const parts = base.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : base.slice(0, 2)
  return letters.toUpperCase() || '?'
}

/* ───────────── Copy ───────────── */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  variant = 'secondary',
  size = 'sm',
  className,
  iconOnly,
}: {
  text: string
  label?: string
  copiedLabel?: string
  variant?: Variant
  size?: Size
  className?: string
  iconOnly?: boolean
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])
  const onClick = async () => {
    const ok = await copyToClipboard(text)
    setState(ok ? 'ok' : 'fail')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1800)
  }
  const text2 = state === 'ok' ? copiedLabel : state === 'fail' ? 'Copy blocked' : label
  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => void onClick()}
        aria-label={state === 'ok' ? copiedLabel : label}
        title={state === 'ok' ? copiedLabel : label}
        className={cx(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-n-muted transition-colors hover:bg-n-hover hover:text-n-ink max-md:h-10 max-md:w-10',
          className,
        )}
      >
        <Icon name={state === 'ok' ? 'check' : 'copy'} size={16} className={state === 'ok' ? 'text-n-ok' : ''} />
      </button>
    )
  }
  return (
    <Button variant={variant} size={size} icon={state === 'ok' ? 'check' : 'copy'} onClick={() => void onClick()} className={className}>
      <span aria-live="polite">{text2}</span>
    </Button>
  )
}

/* ───────────── Menus / popovers ───────────── */

/** Closes on outside click and Escape. Returns [open, setOpen, rootRef]. */
export function usePopover<T extends HTMLElement>() {
  const [open, setOpen] = useState(false)
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return [open, setOpen, ref] as const
}

export const menuPanelClass =
  'n-anim-fade absolute z-50 mt-2 min-w-56 overflow-hidden rounded-xl border border-n-line bg-n-surface p-1.5 shadow-n-pop'

export const menuItemClass =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-n-ink-2 no-underline transition-colors hover:bg-n-hover hover:text-n-ink max-md:min-h-11'

/* ───────────── Dialog ───────────── */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-dialog-close])',
      )
      ;(first ?? panel.current)?.focus()
    }, 10)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="n-dash fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div aria-hidden className="n-anim-backdrop absolute inset-0 bg-[rgb(27_26_23/0.4)]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        className={cx(
          'n-anim-fade relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-n-line bg-n-surface shadow-n-pop sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
          <div>
            <h2 id={`${id}-t`} className="text-base font-semibold text-n-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-[13px] leading-5 text-n-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-n-muted hover:bg-n-hover hover:text-n-ink max-md:h-11 max-md:w-11"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {children ? <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div> : null}
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-n-line-soft bg-n-surface-2 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ───────────── Formatting ───────────── */

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", then a date. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} ${d === 1 ? 'day' : 'days'} ago`
  return formatDate(iso)
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n)
}
