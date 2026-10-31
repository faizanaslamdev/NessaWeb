import type { Metadata } from 'next'
import { Suspense } from 'react'

import { FullPageLoading, RequireAccount } from '@/components/account/require-account'
import { CustomerMessages } from '@/components/messages/customer-messages'
import { SiteShell } from '@/components/site/site-shell'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Messages | ${siteConfig.name}`,
  robots: { index: false, follow: false, nocache: true },
}

/**
 * The traveler's conversations with verified businesses. Account-gated on
 * the client (a real account, not a Place Chat guest); reads are limited to
 * the user's own threads by firestore.rules, writes go through callables.
 */
export default function MessagesPage() {
  return (
    <SiteShell footer={false}>
      <RequireAccount inline requireVerifiedEmail={false}>
        <Suspense fallback={<FullPageLoading inline />}>
          <CustomerMessages />
        </Suspense>
      </RequireAccount>
    </SiteShell>
  )
}
