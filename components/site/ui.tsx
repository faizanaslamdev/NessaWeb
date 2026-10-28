/**
 * Public-site building blocks: layout container, section headings, buttons,
 * and store badges. Server components (no state); shared with client pages.
 */

import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

import { Icon, type IconName } from '@/components/dash/icons'
import { appStores } from '@/lib/constants'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('text-[13px] font-semibold tracking-[0.01em] text-n-accent-strong', className)}>{children}</p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  id,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h2 id={id} className="n-display text-[28px] leading-[1.15] sm:text-[34px]">
          {title}
        </h2>
        {description ? <p className="mt-3 text-[16px] leading-7 text-n-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'link'
type Size = 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-n-accent text-white shadow-[0_1px_2px_rgb(74_54_201/0.3)] hover:bg-n-accent-strong',
  secondary: 'border border-n-line-strong bg-n-surface text-n-ink shadow-n-card hover:bg-n-hover',
  ghost: 'text-n-ink-2 hover:bg-n-hover hover:text-n-ink',
  dark: 'bg-n-ink text-white hover:bg-[#33302b]',
  link: 'px-0! h-auto! text-n-accent-strong hover:underline underline-offset-4',
}
const sizes: Record<Size, string> = {
  md: 'h-10 gap-2 rounded-[10px] px-4 text-[14px]',
  lg: 'h-12 gap-2 rounded-xl px-5 text-[15px]',
}

export function siteButtonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string): string {
  return cx(
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap no-underline transition-colors disabled:pointer-events-none disabled:opacity-60',
    sizes[size],
    variants[variant],
    extra,
  )
}

export function SiteButton({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  external,
  ...rest
}: {
  href: string
  variant?: Variant
  size?: Size
  icon?: IconName
  iconRight?: IconName
  external?: boolean
  children: ReactNode
} & Omit<ComponentProps<typeof Link>, 'href'>) {
  const content = (
    <>
      {icon ? <Icon name={icon} size={size === 'lg' ? 18 : 16} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'lg' ? 18 : 16} /> : null}
    </>
  )
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={siteButtonClass(variant, size, className)}>
        {content}
      </a>
    )
  }
  return (
    <Link href={href} className={siteButtonClass(variant, size, className)} {...rest}>
      {content}
    </Link>
  )
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M16.37 12.73c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66l.04-.03ZM14.1 5.98c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27Z" />
    </svg>
  )
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#34A853" d="M3.6 2.3c-.25.27-.4.68-.4 1.2v17c0 .52.15.93.4 1.2l9.5-9.7-9.5-9.7Z" />
      <path fill="#FBBC04" d="m16.3 15.2-3.2-3.2 3.2-3.3 3.8 2.2c1.1.62 1.1 1.64 0 2.27l-3.8 2.03Z" />
      <path fill="#EA4335" d="m16.3 15.2-3.2-3.2-9.5 9.7c.35.37.93.42 1.58.05l11.12-6.55Z" />
      <path fill="#4285F4" d="M16.3 8.7 5.18 2.25C4.53 1.88 3.95 1.93 3.6 2.3l9.5 9.7 3.2-3.3Z" />
    </svg>
  )
}

/** App Store / Google Play buttons (store links open in a new tab). */
export function StoreBadges({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  const base =
    tone === 'dark'
      ? 'bg-n-ink text-white hover:bg-[#33302b]'
      : 'border border-n-line-strong bg-n-surface text-n-ink hover:bg-n-hover'
  return (
    <div className={cx('flex flex-wrap gap-2.5', className)}>
      {appStores.map(store => (
        <a
          key={store.name}
          href={store.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${store.label} (opens in a new tab)`}
          className={cx('inline-flex h-12 items-center gap-2.5 rounded-xl pr-4 pl-3.5 no-underline transition-colors', base)}
        >
          {store.name === 'App Store' ? <AppleGlyph /> : <PlayGlyph />}
          <span className="flex flex-col leading-none">
            <span className="text-[10px] font-medium opacity-75">
              {store.name === 'App Store' ? 'Download on the' : 'Get it on'}
            </span>
            <span className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em]">{store.name}</span>
          </span>
        </a>
      ))}
    </div>
  )
}

/** Small verified mark used on cards and Place pages. */
export function VerifiedMark({ className, label = 'Verified business' }: { className?: string; label?: string }) {
  return (
    <span className={cx('inline-flex items-center text-n-accent', className)} title={label}>
      <Icon name="badge-check" size={18} strokeWidth={2} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
