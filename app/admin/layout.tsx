import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AdminShell } from '@/components/admin/admin-shell'

export const metadata: Metadata = {
  title: { default: 'Admin · NessaChat', template: '%s · NessaChat Admin' },
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Nessa admin console (/admin on www, the root of admin.nessachat.com).
 * Account + admin-role gate is client-side UX; every action is authorized
 * by its Cloud Function.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
