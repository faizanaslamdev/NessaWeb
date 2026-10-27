import type { Metadata } from 'next'

import { AccountShell } from '@/components/account/account-shell'
import { RequireAccount } from '@/components/account/require-account'
import { AdminNav } from '@/components/admin/admin-nav'
import { AdminPlaces } from '@/components/admin/admin-places'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Places | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

/**
 * Admins: QR placements and link stats for any Place, including Places
 * without a business (e.g. Cumbuco). Authorization is the
 * `managePlaceQrPlacements` / `getBusinessPlaceStats` callables, not this page.
 */
export default function AdminPlacesPage() {
  return (
    <RequireAccount>
      <AccountShell title="Places" subtitle="Nessa admin">
        <AdminNav />
        <AdminPlaces />
      </AccountShell>
    </RequireAccount>
  )
}
