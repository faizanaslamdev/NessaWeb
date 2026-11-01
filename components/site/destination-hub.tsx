import Link from 'next/link'

import { PlaceCard } from '@/components/site/place-card'
import { Container, SiteButton } from '@/components/site/ui'
import { siteRoutes } from '@/lib/constants'
import type { DirectoryPlace } from '@/lib/place-directory'
import { serializeJsonLd } from '@/lib/place-seo'

/**
 * Server-rendered destination page (country or city hub): breadcrumb,
 * heading, sub-destination links, the Place grid and structured data.
 */
export function DestinationHub({
  crumbs,
  title,
  intro,
  places,
  links,
  linksTitle,
  jsonLd,
}: {
  /** After "Places"; the last one is this page (not a link). */
  crumbs: { name: string; href: string }[]
  title: string
  intro: string
  places: DirectoryPlace[]
  links?: { name: string; href: string; count?: number }[]
  linksTitle?: string
  jsonLd: Record<string, unknown>[]
}) {
  return (
    <>
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }} />
      ))}
      <section className="border-b border-n-line-soft">
        <Container className="pt-10 pb-8 sm:pt-14">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-x-1.5 text-[13px] text-n-subtle">
            <Link href="/" className="text-n-subtle no-underline hover:text-n-ink">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link href="/places" className="text-n-subtle no-underline hover:text-n-ink">
              Places
            </Link>
            {crumbs.map((c, i) => (
              <span key={c.href} className="contents">
                <span aria-hidden>/</span>
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="text-n-ink-2">
                    {c.name}
                  </span>
                ) : (
                  <Link href={c.href} className="text-n-subtle no-underline hover:text-n-ink">
                    {c.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <h1 className="n-display text-[34px] leading-[1.08] [overflow-wrap:anywhere] sm:text-[46px]">{title}</h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-7 text-n-muted">{intro}</p>
          {links?.length ? (
            <div className="mt-6">
              {linksTitle ? <h2 className="mb-2.5 text-[13px] font-semibold text-n-subtle">{linksTitle}</h2> : null}
              <ul className="flex flex-wrap gap-2">
                {links.map(l => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex items-center gap-1.5 rounded-full border border-n-line bg-n-surface px-3 py-1.5 text-[13px] font-medium text-n-ink-2 no-underline hover:border-n-line-strong hover:text-n-ink"
                    >
                      {l.name}
                      {l.count ? <span className="text-n-subtle tabular-nums">{l.count}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </section>

      <section className="py-8 sm:py-10">
        <Container>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
            {places.map(place => (
              <li key={place.placeId}>
                <PlaceCard place={place} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="pb-16 sm:pb-20">
        <Container>
          <div className="flex flex-col gap-5 rounded-[24px] border border-n-accent-line bg-n-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Own or manage one of these places?</h2>
              <p className="mt-1 text-[15px] text-n-ink-2">
                Claim it for free to add official details, <span className="whitespace-nowrap">Wi-Fi</span> and a welcome message to its live chat.
              </p>
            </div>
            <SiteButton href={`${siteRoutes.forBusinesses}#find`} size="lg" iconRight="arrow-right">
              Claim your place
            </SiteButton>
          </div>
        </Container>
      </section>
    </>
  )
}
