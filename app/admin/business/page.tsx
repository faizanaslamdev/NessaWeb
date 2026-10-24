import type { Metadata } from 'next'

import { AccountShell } from '@/components/account/account-shell'
import { RequireAccount } from '@/components/account/require-account'
import { AdminNav } from '@/components/admin/admin-nav'
import { AdminClaims } from '@/components/business/admin-claims'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Business admin | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

/**
 * Nessa-admin page. Not a dashboard: a pending-claims list and a direct
 * assignment form. Every action is authorized server-side by
 * runBusinessAdminOps (Firestore `admin_users`, role Admin or Super Admin).
 */
export default function BusinessAdminPage() {
  return (
    <RequireAccount>
      <AccountShell title="Business claims" subtitle="Nessa admin">
        <AdminNav />
        <AdminClaims />
      </AccountShell>
    </RequireAccount>
  )
}
