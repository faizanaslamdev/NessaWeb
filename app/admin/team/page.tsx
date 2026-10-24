import type { Metadata } from 'next'

import { AccountShell } from '@/components/account/account-shell'
import { RequireAccount } from '@/components/account/require-account'
import { AdminNav } from '@/components/admin/admin-nav'
import { AdminTeam } from '@/components/admin/admin-team'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Admin team | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

/**
 * Super Admins manage the Nessa admin team here. Authorization is the
 * `manageAdmins` callable (Firestore `admin_users` roles), not this page.
 */
export default function AdminTeamPage() {
  return (
    <RequireAccount>
      <AccountShell title="Admin team" subtitle="Nessa admin">
        <AdminNav />
        <AdminTeam />
      </AccountShell>
    </RequireAccount>
  )
}
