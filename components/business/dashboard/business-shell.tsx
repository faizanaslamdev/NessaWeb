'use client'

/**
 * Business dashboard frame (/business/{businessId}/…): account gate, the
 * business + selected place (`?place=`), sidebar navigation and header with
 * the place switcher. Display only — every action is authorized by its
 * Cloud Function (business membership / place access).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { RequireAccount, FullPageLoading } from '@/components/account/require-account'
import { AppShell, SidebarAccount, type NavGroup } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import { ButtonLink, EmptyState, Panel, cx, menuItemClass, menuPanelClass, usePopover } from '@/components/dash/ui'
import { UserMenu, type UserMenuLink } from '@/components/dash/user-menu'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { useProfileName } from '@/hooks/use-profile-name'
import { accountRoutes, adminConsoleHref } from '@/lib/account/constants'
import { readMyAdminRole } from '@/lib/admin'
import {
  BusinessActionError,
  getMyBusinesses,
  type MyBusiness,
  type MyBusinessPlace,
  type MyInvite,
} from '@/lib/business'
import { placeOutboundUrl } from '@/lib/place-slug'

type BusinessCtx = {
  business: MyBusiness
  place: MyBusinessPlace
  isOwner: boolean
  invites: MyInvite[]
  /** Dashboard path for a section, keeping the selected place. */
  href: (section?: string, placeId?: string) => string
  reload: () => Promise<void>
  patchPlace: (placeId: string, patch: Partial<MyBusinessPlace>) => void
}

const BusinessContext = createContext<BusinessCtx | null>(null)

export function useBusiness(): BusinessCtx {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness outside BusinessShell')
  return ctx
}

const lastPlaceKey = (businessId: string) => `nessa.business.${businessId}.place`

export function BusinessShell({ businessId, children }: { businessId: string; children: ReactNode }) {
  return (
    <RequireAccount>
      <BusinessLoader businessId={businessId}>{children}</BusinessLoader>
    </RequireAccount>
  )
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; business: MyBusiness; invites: MyInvite[] }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }

function BusinessLoader({ businessId, children }: { businessId: string; children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname() || ''
  const [storedPlace, setStoredPlace] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getMyBusinesses()
      const business = data.businesses.find(b => b.businessId === businessId)
      setState(business ? { kind: 'ready', business, invites: data.invites } : { kind: 'missing' })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof BusinessActionError ? e.message : 'Could not load this business.' })
    }
  }, [businessId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    try {
      setStoredPlace(window.localStorage.getItem(lastPlaceKey(businessId)))
    } catch {
      // ignore
    }
  }, [load, businessId])

  const requested = search.get('place')
  const place = useMemo(() => {
    if (state.kind !== 'ready') return null
    const places = state.business.places
    return (
      places.find(p => p.placeId === requested) ??
      places.find(p => p.placeId === storedPlace) ??
      places[0] ??
      null
    )
  }, [state, requested, storedPlace])

  useEffect(() => {
    if (!place) return
    try {
      window.localStorage.setItem(lastPlaceKey(businessId), place.placeId)
    } catch {
      // ignore
    }
  }, [place, businessId])

  const base = `${accountRoutes.business}/${encodeURIComponent(businessId)}`
  const multi = state.kind === 'ready' && state.business.places.length > 1

  const href = useCallback(
    (section = '', placeId?: string) => {
      const id = placeId ?? place?.placeId
      const path = section ? `${base}/${section}` : base
      return multi && id ? `${path}?place=${encodeURIComponent(id)}` : path
    },
    [base, multi, place],
  )

  const patchPlace = useCallback((placeId: string, patch: Partial<MyBusinessPlace>) => {
    setState(s =>
      s.kind === 'ready'
        ? {
            ...s,
            business: {
              ...s.business,
              places: s.business.places.map(p => (p.placeId === placeId ? { ...p, ...patch } : p)),
            },
          }
        : s,
    )
  }, [])

  const ctx = useMemo<BusinessCtx | null>(
    () =>
      state.kind === 'ready' && place
        ? {
            business: state.business,
            place,
            isOwner: state.business.role === 'owner',
            invites: state.invites,
            href,
            reload: load,
            patchPlace,
          }
        : null,
    [state, place, href, load, patchPlace],
  )

  if (state.kind === 'loading') return <FullPageLoading label="Opening your dashboard…" />
  if (!ctx) {
    return (
      <div className="n-dash flex min-h-dvh items-center justify-center bg-n-canvas px-4">
        <Panel className="w-full max-w-md">
          <EmptyState
            icon={state.kind === 'error' ? 'alert' : 'store'}
            title={
              state.kind === 'error'
                ? 'Couldn’t open this business'
                : state.kind === 'ready'
                  ? 'This business has no places yet'
                  : 'You don’t have access to this business'
            }
            action={
              <ButtonLink href={accountRoutes.business} variant="primary">
                Your businesses
              </ButtonLink>
            }
          >
            {state.kind === 'error' ? state.message : 'Ask its owner to invite you, or open a business you manage.'}
          </EmptyState>
        </Panel>
      </div>
    )
  }

  return (
    <BusinessContext.Provider value={ctx}>
      <BusinessFrame
        section={pathname.slice(base.length).replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''}
        onSwitchPlace={id => router.push(`${pathname}?place=${encodeURIComponent(id)}`)}
      >
        {children}
      </BusinessFrame>
    </BusinessContext.Provider>
  )
}

function BusinessFrame({
  section,
  onSwitchPlace,
  children,
}: {
  section: string
  onSwitchPlace: (placeId: string) => void
  children: ReactNode
}) {
  const { business, place, href, isOwner } = useBusiness()
  const { user, signOut } = useAccountAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const email = user?.email ?? ''
  const profileName = useProfileName(user)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void readMyAdminRole(user.uid).then(r => {
      if (!cancelled) setIsAdmin(Boolean(r))
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const onSignOut = useCallback(() => {
    void signOut().then(() => router.replace(accountRoutes.signIn))
  }, [signOut, router])

  const groups: NavGroup[] = [
    {
      items: [
        { href: href(''), label: 'Home', icon: 'home', active: section === '' },
        { href: href('chat'), label: 'Live chat', icon: 'chat', active: section === 'chat' },
        { href: href('qr'), label: 'QR codes', icon: 'qr', active: section === 'qr' },
        { href: href('stats'), label: 'Stats', icon: 'chart', active: section === 'stats' },
        { href: href('guests'), label: 'Guest info', icon: 'wifi', active: section === 'guests' },
      ],
    },
    {
      label: 'Business',
      items: [
        { href: href('team'), label: 'Team', icon: 'users', active: section === 'team' },
        { href: href('details'), label: 'Business details', icon: 'store', active: section === 'details' },
      ],
    },
  ]

  const role = isOwner ? 'Owner' : 'Manager'
  const links: UserMenuLink[] = [
    { href: accountRoutes.business, label: 'All businesses', icon: 'briefcase' },
    ...(isAdmin ? [{ href: adminConsoleHref(), label: 'Admin console', icon: 'shield' as const }] : []),
    { href: '/', label: 'NessaChat website', icon: 'globe' as const },
  ]

  return (
    <AppShell
      product={business.profile.name || 'Business'}
      homeHref={href('')}
      groups={groups}
      storageKey="business"
      headerStart={<PlaceSwitcher onSwitch={onSwitchPlace} />}
      headerEnd={
        <>
          <ButtonLink
            href={placeOutboundUrl({ placeId: place.placeId, slug: place.slug })}
            external
            size="sm"
            variant="ghost"
            className="max-lg:hidden"
          >
            View public page
          </ButtonLink>
          <UserMenu email={email} name={profileName} subtitle={`${role} · ${business.profile.name}`} links={links} onSignOut={onSignOut} />
        </>
      }
      sidebarFooter={<SidebarAccount email={email} name={profileName} subtitle={role} onSignOut={onSignOut} />}
    >
      {children}
    </AppShell>
  )
}

function PlaceSwitcher({ onSwitch }: { onSwitch: (placeId: string) => void }) {
  const { business, place } = useBusiness()
  const [open, setOpen, ref] = usePopover<HTMLDivElement>()
  const multi = business.places.length > 1
  const pill = cx(
    'inline-flex h-9 min-w-0 items-center gap-2 rounded-full border border-n-line-strong bg-n-surface pr-2.5 pl-3 text-sm font-medium text-n-ink shadow-n-card',
    multi ? 'hover:bg-n-hover' : '',
  )
  return (
    <div ref={ref} className="relative min-w-0 shrink max-sm:flex-1">
      {multi ? (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Place: ${place.name}. Change place`}
          className={cx(pill, 'max-w-[320px] max-sm:w-full max-sm:max-w-none')}
        >
          <Icon name="pin" size={15} className="shrink-0 text-n-muted" />
          <span className="min-w-0 flex-1 truncate text-left">{place.name}</span>
          <Icon name="chevrons-up-down" size={14} className="shrink-0 text-n-faint" />
        </button>
      ) : (
        <span className={cx(pill, 'max-w-[320px] max-sm:w-full max-sm:max-w-none')}>
          <Icon name="pin" size={15} className="shrink-0 text-n-muted" />
          <span className="truncate">{place.name}</span>
        </span>
      )}
      {open ? (
        <div role="listbox" aria-label="Your places" className={cx(menuPanelClass, 'left-0 w-72')}>
          {business.places.map(p => (
            <button
              key={p.placeId}
              type="button"
              role="option"
              aria-selected={p.placeId === place.placeId}
              onClick={() => {
                setOpen(false)
                if (p.placeId !== place.placeId) onSwitch(p.placeId)
              }}
              className={menuItemClass}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-n-ink">{p.name}</span>
                <span className="block truncate text-xs text-n-muted">{[p.city, p.country].filter(Boolean).join(', ')}</span>
              </span>
              {p.placeId === place.placeId ? <Icon name="check" size={16} className="text-n-accent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Small link row used on several pages ("Open live chat ↗"). */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-n-accent-strong hover:underline">
      {children}
      <Icon name="external" size={13} />
    </Link>
  )
}
