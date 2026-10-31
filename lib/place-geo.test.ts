import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { DirectoryPlace } from './place-directory'
import {
  buildHubBreadcrumbJsonLd,
  buildHubDescription,
  buildHubItemListJsonLd,
  buildPlaceHubs,
  geoSlug,
  hubsForPlace,
  isValidGeoSlug,
  moreInCity,
} from './place-geo'

let n = 0
function place(over: Partial<DirectoryPlace> = {}): DirectoryPlace {
  n += 1
  return {
    placeId: `ChIJplace${n}`,
    slug: `place-${n}`,
    name: `Place ${n}`,
    city: 'São Luís',
    country: 'Brazil',
    placeType: 'Restaurant',
    recommenderCount: 1,
    storyCount: 0,
    visitedCount: 0,
    verified: false,
    ...over,
  }
}

describe('geoSlug', () => {
  it('folds accents and special letters into lowercase ASCII words', () => {
    assert.equal(geoSlug('São Luís'), 'sao-luis')
    assert.equal(geoSlug('Ngũ Hành Sơn'), 'ngu-hanh-son')
    assert.equal(geoSlug('Đà Nẵng'), 'da-nang')
    assert.equal(geoSlug('Bogotá'), 'bogota')
    assert.equal(geoSlug('  Playa del Carmen '), 'playa-del-carmen')
    assert.equal(geoSlug("Côte d'Ivoire"), 'cote-divoire')
    assert.equal(geoSlug('Straße'), 'strasse')
    assert.equal(geoSlug(''), '')
    assert.equal(geoSlug('東京'), '')
  })

  it('validates hub slugs', () => {
    assert.equal(isValidGeoSlug('sao-luis'), true)
    assert.equal(isValidGeoSlug('Sao-Luis'), false)
    assert.equal(isValidGeoSlug('-x'), false)
    assert.equal(isValidGeoSlug(''), false)
  })
})

describe('buildPlaceHubs', () => {
  it('needs at least 3 indexable Places with a slug per hub', () => {
    const places = [
      place(),
      place(),
      place({ recommenderCount: 0, storyCount: 0 }), // not indexable
      place({ slug: undefined }), // no canonical URL
      place({ city: 'Rio de Janeiro' }),
    ]
    assert.deepEqual(buildPlaceHubs(places).cities, [])
    const hubs = buildPlaceHubs([...places, place({ verified: true, recommenderCount: 0 })])
    assert.equal(hubs.cities.length, 1)
    assert.equal(hubs.cities[0].path, '/destinations/brazil/sao-luis')
    assert.equal(hubs.cities[0].cityName, 'São Luís')
    assert.equal(hubs.cities[0].places.length, 3)
    assert.equal(hubs.countries.length, 1)
    assert.equal(hubs.countries[0].path, '/destinations/brazil')
    assert.equal(hubs.countries[0].places.length, 4)
    assert.deepEqual(hubs.countries[0].cities.map(c => c.citySlug), ['sao-luis'])
  })

  it('merges spellings of one town and keeps same-named towns in different countries apart', () => {
    const places = [
      place({ city: 'Bogotá', country: 'Colombia' }),
      place({ city: 'Bogotá', country: 'Colombia' }),
      place({ city: 'Bogota', country: 'Colombia' }),
      place({ city: 'Cartagena', country: 'Colombia' }),
      place({ city: 'Cartagena', country: 'Spain' }),
      place({ city: 'Cartagena', country: 'Spain' }),
    ]
    const hubs = buildPlaceHubs(places)
    assert.deepEqual(hubs.cities.map(c => [c.path, c.cityName, c.places.length]), [['/destinations/colombia/bogota', 'Bogotá', 3]])
    assert.deepEqual(hubs.countries.map(c => c.slug), ['colombia'])
  })

  it('skips junk town names', () => {
    const hubs = buildPlaceHubs([place({ city: 'MA' }), place({ city: 'MA' }), place({ city: 'MA' })])
    assert.deepEqual(hubs.cities, [])
    assert.equal(hubs.countries.length, 1)
  })

  it('ranks Places with the most traveller content first', () => {
    const quiet = place({ name: 'Quiet', recommenderCount: 1 })
    const busy = place({ name: 'Busy', recommenderCount: 5, storyCount: 2 })
    const verified = place({ name: 'Verified', recommenderCount: 0, verified: true })
    const hub = buildPlaceHubs([quiet, verified, busy]).cities[0]
    assert.deepEqual(hub.places.map(p => p.name), ['Busy', 'Verified', 'Quiet'])
  })

  it('finds the hubs of a Place', () => {
    const hubs = buildPlaceHubs([place(), place(), place()])
    const found = hubsForPlace(hubs, { city: 'Sao Luis', country: 'Brazil' })
    assert.equal(found.city?.citySlug, 'sao-luis')
    assert.equal(found.country?.slug, 'brazil')
    assert.deepEqual(hubsForPlace(hubs, { city: 'Fortim', country: 'Brazil' }).city, null)
    assert.deepEqual(hubsForPlace(hubs, { city: 'X', country: '' }), { country: null, city: null })
  })
})

describe('moreInCity', () => {
  it('lists other indexable Places in the same town, best first, capped', () => {
    const me = place({ name: 'Me' })
    const others = [place({ name: 'A', recommenderCount: 3 }), place({ name: 'B' }), place({ name: 'C', city: 'Rio' })]
    const hidden = place({ name: 'D', recommenderCount: 0 })
    const list = moreInCity([me, ...others, hidden], me)
    assert.deepEqual(list.map(p => p.name), ['A', 'B'])
    assert.equal(moreInCity([me, ...others], me, 1).length, 1)
    assert.deepEqual(moreInCity([me, ...others], { placeId: 'x', city: '' }), [])
  })
})

describe('hub structured data', () => {
  it('builds an ItemList with canonical Place URLs', () => {
    const a = place({ slug: 'cafe-a-sao-luis', name: 'Café A' })
    const ld = buildHubItemListJsonLd({
      name: 'Places in São Luís',
      url: 'https://www.nessachat.com/destinations/brazil/sao-luis',
      places: [a],
      origin: 'https://www.nessachat.com',
    })
    assert.equal(ld['@type'], 'ItemList')
    assert.equal(ld.numberOfItems, 1)
    assert.deepEqual(ld.itemListElement, [
      { '@type': 'ListItem', position: 1, url: 'https://www.nessachat.com/places/cafe-a-sao-luis', name: 'Café A' },
    ])
  })

  it('builds the breadcrumb trail', () => {
    const ld = buildHubBreadcrumbJsonLd('https://www.nessachat.com', [
      { name: 'Brazil', path: '/destinations/brazil' },
      { name: 'São Luís', path: '/destinations/brazil/sao-luis' },
    ])
    const items = ld.itemListElement as { name: string; item: string; position: number }[]
    assert.deepEqual(items.map(i => i.name), ['Home', 'Places', 'Brazil', 'São Luís'])
    assert.equal(items[0].item, 'https://www.nessachat.com/')
    assert.equal(items[3].item, 'https://www.nessachat.com/destinations/brazil/sao-luis')
  })

  it('keeps hub descriptions within 158 characters', () => {
    const d = buildHubDescription({ where: 'São Luís, Brazil', count: 9, examples: ['Bem Dito Bar', 'Flor de Maria'] })
    assert.ok(d.startsWith('9 places travellers recommend in São Luís, Brazil, including Bem Dito Bar, Flor de Maria.'))
    assert.ok(d.length <= 158)
    const long = buildHubDescription({ where: 'X'.repeat(60), count: 3, examples: ['Y'.repeat(60), 'Z'.repeat(60)] })
    assert.ok(long.length <= 158)
  })
})
