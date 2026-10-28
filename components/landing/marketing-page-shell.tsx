import Link from 'next/link'

import { SiteShell } from '@/components/site/site-shell'
import { Container } from '@/components/site/ui'

type MarketingPageShellProps = {
  title: string
  /** Short line under the title (e.g. "Last updated …"). */
  intro?: React.ReactNode
  children: React.ReactNode
}

/** Legal and info pages: site header/footer and a readable text column. */
export function MarketingPageShell({ title, intro, children }: MarketingPageShellProps) {
  return (
    <SiteShell>
      <Container className="py-10 sm:py-16">
        <div className="mx-auto max-w-[720px]">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-n-subtle">
            <Link href="/" className="text-n-subtle no-underline hover:text-n-ink">
              Home
            </Link>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            <span aria-current="page" className="text-n-ink-2">
              {title}
            </span>
          </nav>
          <h1 className="n-display text-[34px] leading-[1.1] sm:text-[44px]">{title}</h1>
          {intro ? <div className="mt-3 text-[16px] text-n-muted">{intro}</div> : null}
          <div className="mt-10 space-y-8 text-[15px] leading-7 text-n-ink-2 sm:text-[16px]">{children}</div>
        </div>
      </Container>
    </SiteShell>
  )
}
