'use client'

/**
 * Dashboard frame shared by the Admin console and the Business dashboard.
 *
 * - Desktop (≥1280px): sidebar 240px, or a 64px icon rail. Toggle with the
 *   round handle on the divider or ⌘/Ctrl+B; remembered per device.
 * - Tablet (768–1279px): icon rail; expanding opens the sidebar over the page.
 * - Phone (<768px): a menu button opens the same navigation as a drawer.
 *
 * Widths are CSS-driven (data attributes + group variants) so the first paint
 * is right on every screen; JS only tracks the toggle state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Icon, type IconName } from '@/components/dash/icons'
import { cx, initials } from '@/components/dash/ui'

export type NavItem = {
  href: string
  label: string
  icon: IconName
  active?: boolean
  /** Count or short text shown on the item (a dot on the rail). */
  badge?: string | number | null
  external?: boolean
}

export type NavGroup = { label?: string; items: NavItem[] }

export type Crumb = { label: string; href?: string }

type TitleCtx = { setCrumbs: (crumbs: Crumb[]) => void }
const ShellTitleContext = createContext<TitleCtx | null>(null)

/** Pages set the header breadcrumb with <ShellTitle crumbs=… />. */
export function ShellTitle({ crumbs }: { crumbs: Crumb[] }) {
  const ctx = useContext(ShellTitleContext)
  const key = JSON.stringify(crumbs)
  useEffect(() => {
    ctx?.setCrumbs(JSON.parse(key) as Crumb[])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content
  }, [key])
  useEffect(() => {
    if (typeof document !== 'undefined' && crumbs.length) {
      document.title = `${crumbs[crumbs.length - 1].label} · NessaChat`
    }
  }, [crumbs])
  return null
}

type Mode = 'phone' | 'tablet' | 'desktop'

function useMode(): Mode {
  const [mode, setMode] = useState<Mode>('desktop')
  useEffect(() => {
    const desk = window.matchMedia('(min-width: 1280px)')
    const tab = window.matchMedia('(min-width: 768px)')
    const update = () => setMode(desk.matches ? 'desktop' : tab.matches ? 'tablet' : 'phone')
    update()
    desk.addEventListener('change', update)
    tab.addEventListener('change', update)
    return () => {
      desk.removeEventListener('change', update)
      tab.removeEventListener('change', update)
    }
  }, [])
  return mode
}

function readCollapsed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // private mode etc. — the toggle still works for this visit
  }
}

export function AppShell({
  product,
  homeHref,
  groups,
  storageKey,
  headerStart,
  headerEnd,
  sidebarFooter,
  children,
}: {
  /** Shown next to the logo, e.g. "Admin" or the business name. */
  product: string
  homeHref: string
  groups: NavGroup[]
  storageKey: string
  /** Extra header content after the breadcrumb (e.g. a place switcher). */
  headerStart?: ReactNode
  headerEnd?: ReactNode
  sidebarFooter?: ReactNode
  children: ReactNode
}) {
  const mode = useMode()
  const pathname = usePathname()
  const lsKey = `nessa.sidebar.${storageKey}`
  const [collapsed, setCollapsed] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null)

  useEffect(() => {
    // Restore the remembered desktop choice after mount (SSR renders expanded).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(readCollapsed(lsKey))
  }, [lsKey])

  // Leaving tablet closes the overlay; navigation closes overlay + drawer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mode !== 'tablet') setOverlay(false)
    if (mode !== 'phone') setDrawer(false)
  }, [mode])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverlay(false)
    setDrawer(false)
    setTip(null)
  }, [pathname])

  const narrow = mode === 'tablet' ? !overlay : mode === 'desktop' ? collapsed : false

  const toggle = useCallback(() => {
    setTip(null)
    if (window.matchMedia('(min-width: 1280px)').matches) {
      setCollapsed(c => {
        writeCollapsed(lsKey, !c)
        return !c
      })
    } else if (window.matchMedia('(min-width: 768px)').matches) {
      setOverlay(o => !o)
    } else {
      setDrawer(d => !d)
    }
  }, [lsKey])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
        const t = e.target as HTMLElement | null
        if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape') {
        setOverlay(false)
        setDrawer(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const titleCtx = useMemo<TitleCtx>(() => ({ setCrumbs }), [])

  const showTip = (label: string, el: HTMLElement) => {
    if (!narrow) return
    const r = el.getBoundingClientRect()
    setTip({ label, top: r.top + r.height / 2 })
  }

  const expandedLabel = narrow ? 'Expand sidebar' : 'Collapse sidebar'

  return (
    <ShellTitleContext.Provider value={titleCtx}>
      <div
        className="n-dash group/shell min-h-dvh bg-n-canvas text-n-ink antialiased"
        data-collapsed={collapsed ? 'true' : 'false'}
        data-overlay={overlay ? 'true' : 'false'}
      >
        <a
          href="#main"
          className="sr-only z-[70] rounded-lg bg-n-surface px-3 py-2 text-sm text-n-ink shadow-n-pop focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>

        {/* Tablet overlay backdrop */}
        {overlay ? (
          <div
            aria-hidden
            onClick={() => setOverlay(false)}
            className="n-anim-backdrop fixed inset-0 z-30 hidden bg-[rgb(27_26_23/0.25)] md:block xl:hidden"
          />
        ) : null}

        {/* Sidebar (tablet + desktop) */}
        <aside
          aria-label="Sidebar"
          className={cx(
            'fixed inset-y-0 left-0 z-40 hidden w-16 flex-col border-r border-n-line bg-n-surface transition-[width,box-shadow] duration-200 ease-out md:flex',
            'xl:w-60 xl:group-data-[collapsed=true]/shell:w-16',
            'max-xl:group-data-[overlay=true]/shell:w-60 max-xl:group-data-[overlay=true]/shell:shadow-n-pop',
          )}
        >
          <Brand product={product} homeHref={homeHref} />
          <button
            type="button"
            onClick={toggle}
            aria-label={expandedLabel}
            title={`${expandedLabel} (⌘B)`}
            aria-expanded={!narrow}
            className="absolute top-[14px] -right-[14px] z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-n-line-strong bg-n-surface text-n-muted shadow-n-card transition-colors hover:border-n-faint hover:text-n-ink"
          >
            <Icon
              name="chevron-left"
              size={15}
              className={cx('transition-transform duration-200', narrow ? 'rotate-180' : '')}
            />
          </button>
          <nav aria-label="Main" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2">
            <NavList groups={groups} onHover={showTip} onLeave={() => setTip(null)} />
          </nav>
          {sidebarFooter ? (
            <div className="overflow-hidden border-t border-n-line-soft py-2 whitespace-nowrap">{sidebarFooter}</div>
          ) : null}
        </aside>

        {/* Rail tooltip */}
        {tip && narrow ? (
          <div
            role="tooltip"
            style={{ top: tip.top }}
            className="pointer-events-none fixed left-[72px] z-50 -translate-y-1/2 rounded-md bg-n-ink px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-n-pop"
          >
            {tip.label}
          </div>
        ) : null}

        {/* Phone drawer */}
        {drawer ? (
          <MobileDrawer
            product={product}
            homeHref={homeHref}
            groups={groups}
            footer={sidebarFooter}
            onClose={() => setDrawer(false)}
          />
        ) : null}

        <div className="transition-[padding] duration-200 ease-out md:pl-16 xl:pl-60 xl:group-data-[collapsed=true]/shell:pl-16">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-n-line bg-n-surface/90 px-2 backdrop-blur-md md:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-n-ink hover:bg-n-hover md:hidden"
            >
              <Icon name="menu" size={20} />
            </button>
            <Breadcrumbs crumbs={crumbs} hideOnPhone={Boolean(headerStart)} />
            {headerStart}
            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">{headerEnd}</div>
          </header>
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-16 outline-none md:px-6 md:pt-7 xl:px-10">
            {children}
          </main>
        </div>
      </div>
    </ShellTitleContext.Provider>
  )
}

function Brand({ product, homeHref, onNavigate }: { product: string; homeHref: string; onNavigate?: () => void }) {
  return (
    <Link
      href={homeHref}
      onClick={onNavigate}
      className="flex h-14 shrink-0 items-center gap-2.5 overflow-hidden border-b border-n-line-soft px-[18px] whitespace-nowrap text-n-ink no-underline"
    >
      <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0" priority />
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tracking-[-0.01em]">NessaChat</span>
        <span className="truncate text-[13px] text-n-muted">{product}</span>
      </span>
    </Link>
  )
}

function NavList({
  groups,
  onHover,
  onLeave,
  onNavigate,
  roomy,
}: {
  groups: NavGroup[]
  onHover?: (label: string, el: HTMLElement) => void
  onLeave?: () => void
  onNavigate?: () => void
  roomy?: boolean
}) {
  return (
    <>
      {groups.map((g, gi) => (
        <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
          {g.label ? (
            <p
              className={cx(
                'flex h-7 items-center overflow-hidden px-[22px] text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap text-n-faint uppercase transition-opacity',
                roomy
                  ? ''
                  : 'opacity-0 xl:group-data-[collapsed=false]/shell:opacity-100 max-xl:group-data-[overlay=true]/shell:opacity-100',
              )}
            >
              {g.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {g.items.map(item => (
              <li key={item.href + item.label}>
                <NavLink item={item} onHover={onHover} onLeave={onLeave} onNavigate={onNavigate} roomy={roomy} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function NavLink({
  item,
  onHover,
  onLeave,
  onNavigate,
  roomy,
}: {
  item: NavItem
  onHover?: (label: string, el: HTMLElement) => void
  onLeave?: () => void
  onNavigate?: () => void
  roomy?: boolean
}) {
  const hasBadge = item.badge !== undefined && item.badge !== null && item.badge !== 0 && item.badge !== ''
  const cls = cx(
    'relative mx-2 flex items-center gap-3 overflow-hidden rounded-[10px] px-[14px] text-sm whitespace-nowrap no-underline transition-colors',
    roomy ? 'h-12' : 'h-10',
    item.active
      ? 'bg-n-accent-soft font-medium text-n-accent-strong'
      : 'text-n-ink-2 hover:bg-n-hover hover:text-n-ink',
  )
  const content = (
    <>
      <span className="relative inline-flex shrink-0">
        <Icon name={item.icon} size={20} className={item.active ? 'text-n-accent' : 'text-n-muted'} />
        {hasBadge && !roomy ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-n-accent ring-2 ring-n-surface xl:group-data-[collapsed=false]/shell:hidden max-xl:group-data-[overlay=true]/shell:hidden"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {hasBadge ? (
        <span className="rounded-full bg-n-warn-soft px-2 text-xs leading-5 font-medium text-n-warn tabular-nums">
          {item.badge}
        </span>
      ) : null}
      {item.external ? <Icon name="external" size={14} className="text-n-faint" /> : null}
    </>
  )
  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => onHover?.(item.label, e.currentTarget),
    onFocus: (e: React.FocusEvent<HTMLElement>) => onHover?.(item.label, e.currentTarget),
    onMouseLeave: () => onLeave?.(),
    onBlur: () => onLeave?.(),
  }
  return item.external ? (
    <a href={item.href} target="_blank" rel="noreferrer" className={cls} aria-label={item.label} {...handlers}>
      {content}
    </a>
  ) : (
    <Link
      href={item.href}
      className={cls}
      aria-current={item.active ? 'page' : undefined}
      onClick={onNavigate}
      {...handlers}
    >
      {content}
    </Link>
  )
}

function MobileDrawer({
  product,
  homeHref,
  groups,
  footer,
  onClose,
}: {
  product: string
  homeHref: string
  groups: NavGroup[]
  footer?: ReactNode
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('a[aria-current="page"], a')?.focus()
    return () => {
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [])
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div aria-hidden onClick={onClose} className="n-anim-backdrop absolute inset-0 bg-[rgb(27_26_23/0.36)]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="n-anim-drawer absolute inset-y-0 left-0 flex w-[300px] max-w-[86vw] flex-col bg-n-surface shadow-n-pop"
      >
        <div className="flex items-center border-b border-n-line-soft pr-2">
          <div className="min-w-0 flex-1">
            <Brand product={product} homeHref={homeHref} onNavigate={onClose} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-n-muted hover:bg-n-hover hover:text-n-ink"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto py-3">
          <NavList groups={groups} onNavigate={onClose} roomy />
        </nav>
        {footer ? (
          <div className="border-t border-n-line-soft py-2 pb-[max(8px,env(safe-area-inset-bottom))]">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

function Breadcrumbs({ crumbs, hideOnPhone }: { crumbs: Crumb[]; hideOnPhone?: boolean }) {
  if (!crumbs.length) return <div className={cx('min-w-0 flex-1', hideOnPhone ? 'max-sm:hidden' : '')} />
  const last = crumbs[crumbs.length - 1]
  return (
    <nav aria-label="Breadcrumb" className={cx('min-w-0 flex-1', hideOnPhone ? 'max-sm:hidden' : '')}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.slice(0, -1).map(c => (
          <li key={c.label} className="hidden min-w-0 items-center gap-1.5 sm:flex">
            {c.href ? (
              <Link href={c.href} className="truncate text-n-muted no-underline hover:text-n-ink">
                {c.label}
              </Link>
            ) : (
              <span className="truncate text-n-muted">{c.label}</span>
            )}
            <Icon name="chevron-right" size={14} className="shrink-0 text-n-faint" />
          </li>
        ))}
        <li className="min-w-0">
          <span aria-current="page" className="block truncate font-semibold text-n-ink">
            {last.label}
          </span>
        </li>
      </ol>
    </nav>
  )
}

/** Account block at the bottom of the sidebar / drawer. */
export function SidebarAccount({
  email,
  name,
  subtitle,
  onSignOut,
}: {
  email: string
  name?: string | null
  subtitle: string
  onSignOut: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4">
      <span
        aria-hidden
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-n-accent-soft text-xs font-semibold text-n-accent-strong"
      >
        {initials(name || email)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-n-ink">{name || email}</span>
        <span className="block truncate text-xs text-n-muted">{subtitle}</span>
      </span>
      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-n-muted hover:bg-n-hover hover:text-n-ink max-md:h-11 max-md:w-11"
      >
        <Icon name="logout" size={17} />
      </button>
    </div>
  )
}
