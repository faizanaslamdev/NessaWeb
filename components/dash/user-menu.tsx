'use client'

import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'
import { Avatar, cx, menuItemClass, menuPanelClass, usePopover } from '@/components/dash/ui'

export type UserMenuLink = { href: string; label: string; icon: IconName; external?: boolean }

/** Avatar button in the dashboard header with account links and Sign out. */
export function UserMenu({
  email,
  name,
  subtitle,
  links,
  onSignOut,
}: {
  email: string
  name?: string | null
  subtitle?: string
  links: UserMenuLink[]
  onSignOut: () => void
}) {
  const [open, setOpen, ref] = usePopover<HTMLDivElement>()
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${email}`}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-n-hover md:h-9 md:w-9"
      >
        <Avatar name={name || email} size={32} />
      </button>
      {open ? (
        <div role="menu" className={cx(menuPanelClass, 'right-0 w-64')}>
          <div className="px-2.5 pt-1.5 pb-2">
            {name ? <p className="truncate text-sm font-medium text-n-ink">{name}</p> : null}
            <p className={name ? 'truncate text-xs text-n-muted' : 'truncate text-sm font-medium text-n-ink'}>{email}</p>
            {subtitle ? <p className="text-xs text-n-muted">{subtitle}</p> : null}
          </div>
          <div className="my-1 h-px bg-n-line-soft" />
          {links.map(l =>
            l.external ? (
              <a key={l.href} role="menuitem" href={l.href} target="_blank" rel="noreferrer" className={menuItemClass}>
                <Icon name={l.icon} size={17} className="text-n-muted" />
                <span className="flex-1">{l.label}</span>
                <Icon name="external" size={13} className="text-n-faint" />
              </a>
            ) : (
              <Link key={l.href} role="menuitem" href={l.href} onClick={() => setOpen(false)} className={menuItemClass}>
                <Icon name={l.icon} size={17} className="text-n-muted" />
                {l.label}
              </Link>
            ),
          )}
          <div className="my-1 h-px bg-n-line-soft" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className={menuItemClass}
          >
            <Icon name="logout" size={17} className="text-n-muted" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
