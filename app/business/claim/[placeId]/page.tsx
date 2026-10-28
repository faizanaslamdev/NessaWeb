import type { Metadata } from 'next'

import { RequireAccount } from '@/components/account/require-account'
import { ClaimForm } from '@/components/business/claim-form'
import { SiteShell } from '@/components/site/site-shell'
import { Container } from '@/components/site/ui'
import { isPublicPlaceIdValid } from '@/lib/place-landing'

type PageProps = { params: Promise<{ placeId: string }> }

export const metadata: Metadata = {
  title: 'Claim your place | NessaChat',
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
    <SiteShell>
      <Container className="py-10 sm:py-14">
        <div className="mb-8 max-w-2xl">
          <h1 className="n-display text-[32px] leading-[1.1] sm:text-[40px]">Claim your place</h1>
          <p className="mt-2 text-[16px] leading-7 text-n-muted">
            Tell us who you are. We check every claim by hand before anything changes on the page.
          </p>
        </div>
        <RequireAccount inline>
          {isPublicPlaceIdValid(placeId) ? (
            <ClaimForm placeId={placeId} />
          ) : (
            <p className="rounded-2xl border border-n-line bg-n-surface p-6 text-[15px] text-n-muted">
              This place link isn’t valid.{' '}
              <a href="/for-businesses#find" className="font-semibold text-n-accent-strong">
                Find your business
              </a>
            </p>
          )}
        </RequireAccount>
      </Container>
    </SiteShell>
  )
}
