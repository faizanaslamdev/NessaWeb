import type { Metadata } from 'next'

import { SiteShell } from '@/components/site/site-shell'
import { Container, SiteButton } from '@/components/site/ui'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Page not found | ${siteConfig.name}`,
  description: 'This page does not exist on NessaChat.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <SiteShell>
      <Container className="flex flex-col items-center py-20 text-center sm:py-28">
        <p className="text-[14px] font-semibold text-n-accent-strong">404</p>
        <h1 className="n-display mt-2 text-[34px] leading-tight sm:text-[44px]">We couldn’t find that page</h1>
        <p className="mt-3 max-w-md text-[16px] leading-7 text-n-muted">
          The link may be old or mistyped. If someone shared a place with you, try searching for it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <SiteButton href="/places" icon="search" size="lg">
            Explore places
          </SiteButton>
          <SiteButton href="/" variant="secondary" size="lg">
            Go home
          </SiteButton>
        </div>
      </Container>
    </SiteShell>
  )
}
