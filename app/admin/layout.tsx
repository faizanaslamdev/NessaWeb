import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'

import { AdminShell } from '@/components/admin/admin-shell'
import { ADMIN_HOSTNAME_PREFIX } from '@/lib/account/constants'

export const metadata: Metadata = {
  title: { default: 'Admin · NessaChat', template: '%s · NessaChat Admin' },
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Nessa admin console: the root of admin.nessachat.com (host rewrite in
 * next.config) and /admin on www for development and fallback. The request
 * host decides the link base so server-rendered links are already right.
 * Account + admin-role gate is client-side UX; every action is authorized
 * by its Cloud Function.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const host = ((await headers()).get('x-forwarded-host') ?? (await headers()).get('host') ?? '').toLowerCase()
  const base = host.startsWith(ADMIN_HOSTNAME_PREFIX) ? '' : '/admin'
  return <AdminShell base={base}>{children}</AdminShell>
}
