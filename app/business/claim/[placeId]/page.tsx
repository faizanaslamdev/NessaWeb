import type { Metadata } from 'next'

import { AccountShell } from '@/components/account/account-shell'
import { RequireAccount } from '@/components/account/require-account'
import { ClaimForm } from '@/components/business/claim-form'
import { isPublicPlaceIdValid } from '@/lib/place-landing'
import { siteConfig } from '@/lib/constants'

type PageProps = { params: Promise<{ placeId: string }> }

export const metadata: Metadata = {
  title: `Claim this place | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

export default async function ClaimPlacePage({ params }: PageProps) {
  const { placeId: raw } = await params
  let placeId = ''
  try {
    placeId = decodeURIComponent(raw || '').trim()
  } catch {
    placeId = (raw || '').trim()
  }
  return (
    <RequireAccount>
      <AccountShell title="Claim this place" subtitle="Tell us who you are. We verify every claim by hand.">
        {isPublicPlaceIdValid(placeId) ? (
          <ClaimForm placeId={placeId} />
        ) : (
          <p className="text-center text-sm text-gray-400">This place link isn’t valid.</p>
        )}
      </AccountShell>
    </RequireAccount>
  )
}
