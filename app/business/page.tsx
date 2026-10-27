import type { Metadata } from 'next'

import { BusinessHome } from '@/components/account/business-home'
import { RequireAccount } from '@/components/account/require-account'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Your business | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

/**
 * Business area entry (Phase A fills this with claims, profile and tools).
 * Account-gated client-side here; every action it will offer is enforced
 * server-side (Cloud Functions membership checks + Firestore rules).
 */
export default function BusinessPage() {
  return (
    <RequireAccount>
      <BusinessHome />
    </RequireAccount>
  )
}
