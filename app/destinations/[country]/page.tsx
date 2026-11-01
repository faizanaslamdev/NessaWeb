import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DestinationHub } from '@/components/site/destination-hub'
import { SiteShell } from '@/components/site/site-shell'
import {
  buildHubBreadcrumbJsonLd,
  buildHubDescription,
  buildHubItemListJsonLd,
  findCountryHub,
  isValidGeoSlug,
  type CountryHub,
} from '@/lib/place-geo'
import { getPlaceHubs } from '@/lib/place-hubs-server'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

/** Same window as the directory cache: at most one regeneration per 10 min. */
export const revalidate = 600

type PageProps = { params: Promise<{ country: string }> }

/** Countries with enough Places are prerendered; new ones render on first visit (ISR). */
export async function generateStaticParams(): Promise<{ country: string }[]> {
  const data = await getPlaceHubs().catch(() => null)
  return data ? data.hubs.countries.map(c => ({ country: c.slug })) : []
}

async function loadHub(params: PageProps['params']): Promise<CountryHub | null> {
  const { country } = await params
  if (!isValidGeoSlug(country)) return null
  const data = await getPlaceHubs()
  return data ? findCountryHub(data.hubs, country) : null
}

/** Shown on the page; JSON-LD lists the same Places. */
const MAX_PLACES = 60

function hubCopy(hub: CountryHub) {
  const title = `Places to visit in ${hub.name}`
  const description = buildHubDescription({
    where: hub.name,
    count: hub.places.length,
    examples: hub.places.slice(0, 3).map(p => p.name),
  })
  return { title, description, url: `${PLACE_PUBLIC_ORIGIN}${hub.path}` }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const hub = await loadHub(params)
  if (!hub) return { title: 'Destination not found | NessaChat', robots: { index: false, follow: true } }
  const { title, description, url } = hubCopy(hub)
  const cover = hub.places.find(p => p.photoUrl)?.photoUrl
  return {
    title: `${title} | NessaChat`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'NessaChat',
      type: 'website',
      images: cover ? [{ url: cover, alt: title }] : [{ url: '/og.png', width: 1200, height: 630, alt: 'NessaChat' }],
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title, description, images: [cover ?? '/og.png'] },
  }
}

export default async function CountryHubPage({ params }: PageProps) {
  const hub = await loadHub(params)
  if (!hub) notFound()
  const { title, url } = hubCopy(hub)
  const places = hub.places.slice(0, MAX_PLACES)
  const towns = hub.cities.length
    ? ` Start with ${hub.cities.slice(0, 3).map(c => c.cityName).join(', ')}.`
    : ''
  return (
    <SiteShell>
      <DestinationHub
        crumbs={[{ name: hub.name, href: hub.path }]}
        title={title}
        intro={`${hub.places.length} places in ${hub.name} that NessaChat travellers and locals recommend — each with notes, stories and its own live chat.${towns}`}
        places={places}
        linksTitle={hub.cities.length ? `Towns in ${hub.name}` : undefined}
        links={hub.cities.map(c => ({ name: c.cityName, href: c.path, count: c.places.length }))}
        jsonLd={[
          buildHubItemListJsonLd({ name: title, url, places, origin: PLACE_PUBLIC_ORIGIN }),
          buildHubBreadcrumbJsonLd(PLACE_PUBLIC_ORIGIN, [{ name: hub.name, path: hub.path }]),
        ]}
      />
    </SiteShell>
  )
}
