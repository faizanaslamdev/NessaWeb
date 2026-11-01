import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DestinationHub } from '@/components/site/destination-hub'
import { SiteShell } from '@/components/site/site-shell'
import {
  buildHubBreadcrumbJsonLd,
  buildHubDescription,
  buildHubItemListJsonLd,
  findCityHub,
  findCountryHub,
  isValidGeoSlug,
  type CityHub,
  type CountryHub,
} from '@/lib/place-geo'
import { getPlaceHubs } from '@/lib/place-hubs-server'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

/** Same window as the directory cache: at most one regeneration per 10 min. */
export const revalidate = 600

type PageProps = { params: Promise<{ country: string; city: string }> }

/** Towns with enough Places are prerendered; new ones render on first visit (ISR). */
export async function generateStaticParams(): Promise<{ country: string; city: string }[]> {
  const data = await getPlaceHubs().catch(() => null)
  return data ? data.hubs.cities.map(c => ({ country: c.countrySlug, city: c.citySlug })) : []
}

async function loadHub(params: PageProps['params']): Promise<{ city: CityHub; country: CountryHub | null; siblings: CityHub[] } | null> {
  const { country, city } = await params
  if (!isValidGeoSlug(country) || !isValidGeoSlug(city)) return null
  const data = await getPlaceHubs()
  const hub = data ? findCityHub(data.hubs, country, city) : null
  if (!data || !hub) return null
  const countryHub = findCountryHub(data.hubs, country)
  return { city: hub, country: countryHub, siblings: (countryHub?.cities ?? []).filter(c => c.citySlug !== city) }
}

function hubCopy(hub: CityHub) {
  const where = hub.countryName ? `${hub.cityName}, ${hub.countryName}` : hub.cityName
  const title = `Places to visit in ${hub.cityName}`
  const description = buildHubDescription({
    where,
    count: hub.places.length,
    examples: hub.places.slice(0, 3).map(p => p.name),
  })
  return { where, title, description, url: `${PLACE_PUBLIC_ORIGIN}${hub.path}` }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loaded = await loadHub(params)
  if (!loaded) return { title: 'Destination not found | NessaChat', robots: { index: false, follow: true } }
  const { where, title, description, url } = hubCopy(loaded.city)
  const cover = loaded.city.places.find(p => p.photoUrl)?.photoUrl
  return {
    title: `Places to visit in ${where} | NessaChat`,
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

export default async function CityHubPage({ params }: PageProps) {
  const loaded = await loadHub(params)
  if (!loaded) notFound()
  const { city, country, siblings } = loaded
  const { where, title, url } = hubCopy(city)
  const crumbs = [
    ...(country ? [{ name: country.name, href: country.path }] : []),
    { name: city.cityName, href: city.path },
  ]
  return (
    <SiteShell>
      <DestinationHub
        crumbs={crumbs}
        title={title}
        intro={`${city.places.length} places in ${where} that NessaChat travellers and locals recommend. Open one to read their notes and stories, and to join its live chat — no app needed.`}
        places={city.places}
        linksTitle={siblings.length && country ? `More in ${country.name}` : undefined}
        links={siblings.map(c => ({ name: c.cityName, href: c.path, count: c.places.length }))}
        jsonLd={[
          buildHubItemListJsonLd({ name: `Places in ${where}`, url, places: city.places, origin: PLACE_PUBLIC_ORIGIN }),
          buildHubBreadcrumbJsonLd(
            PLACE_PUBLIC_ORIGIN,
            crumbs.map(c => ({ name: c.name, path: c.href })),
          ),
        ]}
      />
    </SiteShell>
  )
}
