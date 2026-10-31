'use client'

/**
 * Admin console frame: account gate, admin-role check (display only — every
 * action is authorized by the backend), sidebar navigation and header.
 *
 * Served at /admin on www and at the root of admin.nessachat.com (host
 * rewrite in next.config). Links use `useAdminHref`, which drops the /admin
 * prefix on the admin host; /admin/… paths keep working there too.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { FullPageLoading, RequireAccount } from '@/components/account/require-account'
import { AppShell, SidebarAccount, type NavGroup } from '@/components/dash/app-shell'
import { Badge, buttonClass } from '@/components/dash/ui'
import { UserMenu } from '@/components/dash/user-menu'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { useProfileName } from '@/hooks/use-profile-name'
import { accountRoutes, ADMIN_HOSTNAME_PREFIX } from '@/lib/account/constants'
import { ADMIN_ROLE_LABELS, readMyAdminRole, type AdminRole } from '@/lib/admin'
import { getConsoleOverview, type ConsoleOverview } from '@/lib/admin-console'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

type AdminCtx = {
  role: AdminRole
  uid: string
  email: string
  displayName: string | null
  /** '' on admin.nessachat.com, '/admin' elsewhere. */
  base: string
  overview: ConsoleOverview | null
  overviewError: string | null
  refreshOverview: () => Promise<void>
}

const AdminContext = createContext<AdminCtx | null>(null)

export function useAdmin(): AdminCtx {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin outside AdminShell')
  return ctx
}

/** Base from the server (request host); re-checked on the client as a fallback. */
function useBase(initial: string): string {
  const [base, setBase] = useState(initial)
  useEffect(() => {
    const onAdminHost = window.location.hostname.startsWith(ADMIN_HOSTNAME_PREFIX)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBase(onAdminHost ? '' : '/admin')
  }, [])
  return base
}

/** Console path → href on this host: adminHref('places') → '/admin/places' or '/places'. */
export function useAdminHref(): (path?: string) => string {
  const { base } = useAdmin()
  return useCallback((path = '') => {
    const clean = path.replace(/^\/+/, '')
    return clean ? `${base}/${clean}` : base || '/'
  }, [base])
}

/** Current console section ('', 'places', 'places/ChIJ…', …) on either host. */
function useSection(): string {
  const pathname = usePathname() || ''
  return pathname.replace(/^\/admin(?=\/|$)/, '').replace(/^\/+|\/+$/g, '')
}

export function AdminShell({ children, base: initialBase = '/admin' }: { children: ReactNode; base?: string }) {
  return (
    <RequireAccount>
      <AdminGate initialBase={initialBase}>{children}</AdminGate>
    </RequireAccount>
  )
}

function AdminGate({ children, initialBase }: { children: ReactNode; initialBase: string }) {
  const { user, signOut } = useAccountAuth()
  const router = useRouter()
  const base = useBase(initialBase)
  const profileName = useProfileName(user)
  const [role, setRole] = useState<AdminRole | null | undefined>(undefined)
  const [overview, setOverview] = useState<ConsoleOverview | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void readMyAdminRole(user.uid).then(r => {
      if (!cancelled) setRole(r)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const refreshOverview = useCallback(async () => {
    try {
      setOverview(await getConsoleOverview())
      setOverviewError(null)
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : 'Could not load the overview.')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (role) void refreshOverview()
  }, [role, refreshOverview])

  const ctx = useMemo<AdminCtx | null>(
    () =>
      role && user
        ? { role, uid: user.uid, email: user.email ?? '', displayName: profileName, base, overview, overviewError, refreshOverview }
        : null,
    [role, user, profileName, base, overview, overviewError, refreshOverview],
  )

  const doSignOut = useCallback(() => {
    void signOut().then(() => router.replace(accountRoutes.signIn))
  }, [signOut, router])

  if (role === undefined) return <FullPageLoading label="Opening the admin console…" />
  if (!ctx) return <NoAccess email={user?.email ?? ''} onSignOut={doSignOut} />

  return (
    <AdminContext.Provider value={ctx}>
      <AdminFrame onSignOut={doSignOut}>{children}</AdminFrame>
    </AdminContext.Provider>
  )
}

function AdminFrame({ children, onSignOut }: { children: ReactNode; onSignOut: () => void }) {
  const { role, email, displayName, base, overview } = useAdmin()
  const section = useSection()
  const href = (p: string) => (p ? `${base}/${p}` : base || '/')
  const top = section.split('/')[0]
  const pending = overview?.counts.pendingClaims ?? null

  const groups: NavGroup[] = [
    {
      items: [
        { href: href(''), label: 'Overview', icon: 'home', active: top === '' },
        { href: href('places'), label: 'Places', icon: 'pin', active: top === 'places' || top === 'chats' },
        { href: href('business'), label: 'Business claims', icon: 'briefcase', active: top === 'business', badge: pending || null },
        { href: href('reports'), label: 'Reports', icon: 'flag', active: top === 'reports' },
        { href: href('audit'), label: 'Audit log', icon: 'log', active: top === 'audit' },
      ],
    },
    ...(role === 'super_admin'
      ? [{ label: 'Super Admin', items: [{ href: href('team'), label: 'Admin team', icon: 'shield' as const, active: top === 'team' }] }]
      : []),
    {
      label: 'Nessa',
      items: [{ href: PLACE_PUBLIC_ORIGIN, label: 'Public website', icon: 'globe' as const, external: true }],
    },
  ]

  return (
    <AppShell
      product="Admin"
      homeHref={href('')}
      groups={groups}
      storageKey="admin"
      headerEnd={
        <>
          <span className="hidden sm:inline-flex">
            {/* Inlined at build time; only local builds pointed at the emulators set it. */}
            {process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ? (
              <Badge tone="warn" dot>
                Local emulators
              </Badge>
            ) : (
              <Badge tone="ok" dot>
                Production
              </Badge>
            )}
          </span>
          <UserMenu
            email={email}
            name={displayName}
            subtitle={ADMIN_ROLE_LABELS[role]}
            links={[
              { href: base ? '/business' : `${PLACE_PUBLIC_ORIGIN}/business`, label: 'Business dashboard', icon: 'store', external: !base },
              { href: PLACE_PUBLIC_ORIGIN, label: 'Public website', icon: 'globe', external: true },
            ]}
            onSignOut={onSignOut}
          />
        </>
      }
      sidebarFooter={<SidebarAccount email={email} name={displayName} subtitle={ADMIN_ROLE_LABELS[role]} onSignOut={onSignOut} />}
    >
      {children}
    </AppShell>
  )
}

function NoAccess({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="n-dash flex min-h-dvh flex-col items-center justify-center bg-n-canvas px-4 text-n-ink">
      <div className="w-full max-w-[420px] rounded-[14px] border border-n-line bg-n-surface p-6 text-center shadow-n-card">
        <Image src="/logo.png" alt="" width={40} height={40} className="mx-auto h-10 w-10" />
        <h1 className="mt-3 text-lg font-semibold">No admin access</h1>
        <p className="mt-1 text-sm leading-6 text-n-muted">
          <span className="font-medium text-n-ink">{email}</span> isn’t on the Nessa admin team. If you manage a place,
          open your business dashboard instead.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={typeof window !== 'undefined' && window.location.hostname.startsWith(ADMIN_HOSTNAME_PREFIX) ? `${PLACE_PUBLIC_ORIGIN}/business` : '/business'}
            className={buttonClass('primary', 'md', 'no-underline')}
          >
            Business dashboard
          </Link>
          <button type="button" onClick={onSignOut} className={buttonClass('secondary')}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
