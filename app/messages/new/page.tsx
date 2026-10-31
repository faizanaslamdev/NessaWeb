import type { Metadata } from 'next'
import { Suspense } from 'react'

import { FullPageLoading, RequireAccount } from '@/components/account/require-account'
import { NewBusinessMessage } from '@/components/messages/new-message'
import { SiteShell } from '@/components/site/site-shell'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `New message | ${siteConfig.name}`,
  robots: { index: false, follow: false, nocache: true },
}

/** First message to a Place's verified business (`?place={googlePlaceId}`). */
export default function NewMessagePage() {
  return (
    <SiteShell footer={false}>
      <RequireAccount inline requireVerifiedEmail={false}>
        <Suspense fallback={<FullPageLoading inline />}>
          <NewBusinessMessage />
        </Suspense>
      </RequireAccount>
    </SiteShell>
  )
}
