import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import { PlacesBrowser, PlacesGridStatic } from '@/components/site/places-browser'
import { SiteShell } from '@/components/site/site-shell'
import { Container, SiteButton } from '@/components/site/ui'
import { siteRoutes } from '@/lib/constants'
import { placeHref } from '@/lib/place-directory'
import { getPlaceDirectory } from '@/lib/place-directory-server'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Explore places | NessaChat',
  description:
    'Browse hotels, hostels, cafés, beaches and things to do that travellers recommend on NessaChat — and join each place’s live chat.',
  alternates: { canonical: `${PLACE_PUBLIC_ORIGIN}/places` },
  openGraph: {
    title: 'Explore places on NessaChat',
    description: 'Places travellers recommend, each with its own live chat.',
    url: `${PLACE_PUBLIC_ORIGIN}/places`,
    siteName: 'NessaChat',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NessaChat' }],
  },
}

export default async function PlacesPage() {
  const directory = await getPlaceDirectory()
  const places = directory?.places ?? []
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Places on NessaChat',
    numberOfItems: places.length,
    itemListElement: places.slice(0, 100).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${PLACE_PUBLIC_ORIGIN}${placeHref(p)}`,
      name: p.name,
    })),
  }

  return (
    <SiteShell>
      {places.length ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, '\\u003c') }} />
      ) : null}
      <section className="border-b border-n-line-soft">
        <Container className="pt-10 pb-8 sm:pt-14">
          <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-n-subtle">
            <Link href="/" className="text-n-subtle no-underline hover:text-n-ink">
              Home
            </Link>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            <span aria-current="page" className="text-n-ink-2">
              Places
            </span>
          </nav>
          <h1 className="n-display text-[36px] leading-[1.08] sm:text-[48px]">Explore places</h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-7 text-n-muted">
            Recommended by travellers and locals. Open any place to read their notes and stories, and to join its live
            chat.
          </p>
        </Container>
      </section>

      <section id="search" className="scroll-mt-20 py-8 sm:py-10">
        <Container>
          {places.length ? (
            <Suspense fallback={<PlacesGridStatic places={places} />}>
              <PlacesBrowser places={places} />
            </Suspense>
          ) : (
            <div className="rounded-2xl border border-n-line bg-n-surface px-6 py-12 text-center">
              <p className="text-[17px] font-semibold">Places are taking a moment to load</p>
              <p className="mt-1.5 text-[15px] text-n-muted">Please refresh the page in a minute.</p>
            </div>
          )}
        </Container>
      </section>

      <section className="pb-16 sm:pb-20">
        <Container>
          <div className="flex flex-col gap-5 rounded-[24px] border border-n-accent-line bg-n-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Own or manage one of these places?</h2>
              <p className="mt-1 text-[15px] text-n-ink-2">
                Claim it for free to add official details, Wi-Fi and a welcome message to its live chat.
              </p>
            </div>
            <SiteButton href={`${siteRoutes.forBusinesses}#find`} size="lg" iconRight="arrow-right">
              Claim your place
            </SiteButton>
          </div>
        </Container>
      </section>
    </SiteShell>
  )
}
