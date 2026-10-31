import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { OpeningHours } from './business-profile'
import {
  buildBusinessSeoDescription,
  buildOpeningHoursSpecification,
  buildPlaceBreadcrumbJsonLd,
  buildPlaceJsonLd,
  buildPlaceSeoDescription,
  buildPlaceSeoTitle,
  isPlaceIndexable,
  parseCheckTime,
  placeRobots,
  schemaTypeForBusinessCategory,
  schemaTypeForPlaceType,
  serializeJsonLd,
} from './place-seo'

describe('place SEO', () => {
  it('titles include the city once', () => {
    assert.equal(
      buildPlaceSeoTitle({ name: 'KiteCabana', city: 'Cumbuco' }),
      'KiteCabana, Cumbuco | NessaChat',
    )
    assert.equal(
      buildPlaceSeoTitle({ name: 'Lahore Fort', city: 'Lahore' }),
      'Lahore Fort | NessaChat',
    )
    assert.equal(buildPlaceSeoTitle({ name: '' }), 'Place on NessaChat')
  })

  it('descriptions are unique per place and mention social proof', () => {
    const d = buildPlaceSeoDescription({
      name: 'KiteCabana',
      placeType: 'Hotel',
      city: 'Cumbuco',
      country: 'Brazil',
      recommenderCount: 12,
      storyCount: 1,
    })
    assert.equal(
      d,
      'KiteCabana (hotel) in Cumbuco, Brazil. See 12 traveler recommendations and 1 story on NessaChat.',
    )
    const empty = buildPlaceSeoDescription({ name: 'Quiet Spot', city: 'Jeri' })
    assert.equal(empty, 'Quiet Spot in Jeri. See what travelers say on NessaChat and recommend it.')
    const long = buildPlaceSeoDescription({ name: 'x'.repeat(300) })
    assert.ok(long.length <= 158)
  })

  it('indexes only places with Nessa content', () => {
    assert.equal(isPlaceIndexable({ recommenderCount: 0, storyCount: 0 }), false)
    assert.equal(isPlaceIndexable({ recommenderCount: 1 }), true)
    assert.equal(isPlaceIndexable({ storyCount: 3 }), true)
  })

  it('builds schema.org JSON-LD', () => {
    assert.equal(schemaTypeForPlaceType('Café'), 'CafeOrCoffeeShop')
    assert.equal(schemaTypeForPlaceType('Something'), 'Place')
    const ld = buildPlaceJsonLd(
      { name: 'KiteCabana', placeType: 'Hotel', city: 'Cumbuco', country: 'Brazil' },
      'https://www.nessachat.com/places/kitecabana-cumbuco',
    )
    assert.equal(ld['@type'], 'Hotel')
    assert.equal(ld.url, 'https://www.nessachat.com/places/kitecabana-cumbuco')
    assert.deepEqual(ld.address, {
      '@type': 'PostalAddress',
      addressLocality: 'Cumbuco',
      addressCountry: 'Brazil',
    })
  })

  it('serializes JSON-LD without a script breakout', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    assert.equal(out.includes('<'), false)
    assert.equal(JSON.parse(out).name, '</script><script>alert(1)</script>')
  })
})

describe('place SEO — verified business', () => {
  it('makes a claimed Place indexable and enriches JSON-LD', () => {
    assert.equal(isPlaceIndexable({ recommenderCount: 0, storyCount: 0, business: { name: 'KiteCabana' } }), true)
    assert.equal(isPlaceIndexable({ recommenderCount: 0, storyCount: 0, business: null }), false)
    const ld = buildPlaceJsonLd(
      {
        name: 'KiteCabana',
        placeType: 'Hotel',
        city: 'Cumbuco',
        business: { name: 'KiteCabana', website: 'https://kitecabana.com/', phone: '+55 85 9', logoUrl: 'https://cdn.x/logo.png' },
      },
      'https://www.nessachat.com/places/kitecabana-cumbuco',
    )
    assert.equal(ld.telephone, '+55 85 9')
    assert.deepEqual(ld.sameAs, ['https://kitecabana.com/'])
    assert.equal(ld.logo, 'https://cdn.x/logo.png')
  })
})

const CANONICAL = 'https://www.nessachat.com/places/kitecabana-cumbuco'

describe('place SEO — business JSON-LD', () => {
  it('picks a schema.org type from the business category', () => {
    const expected: Record<string, string> = {
      hostel: 'Hostel',
      hotel: 'Hotel',
      restaurant: 'Restaurant',
      bar: 'BarOrPub',
      cafe: 'CafeOrCoffeeShop',
      kite_school: 'SportsActivityLocation',
      tour: 'TravelAgency',
      shop: 'Store',
      other: 'LocalBusiness',
    }
    for (const [category, type] of Object.entries(expected)) {
      assert.equal(schemaTypeForBusinessCategory(category), type, category)
      const ld = buildPlaceJsonLd(
        { name: 'X', placeType: 'Beach', business: { name: 'X', category: category as never } },
        CANONICAL,
      )
      assert.equal(ld['@type'], type, category)
    }
    // Uncategorized business → LocalBusiness; no business → Place mapping.
    assert.equal(buildPlaceJsonLd({ name: 'X', placeType: 'Hotel', business: { name: 'X' } }, CANONICAL)['@type'], 'LocalBusiness')
    assert.equal(buildPlaceJsonLd({ name: 'X', placeType: 'Beach' }, CANONICAL)['@type'], 'Beach')
  })

  it('adds the business fields', () => {
    const ld = buildPlaceJsonLd(
      {
        name: 'KiteCabana',
        city: 'Cumbuco',
        country: 'Brazil',
        coverImageUrl: 'https://cdn.nessa/cover.jpg',
        coverSource: 'nessa',
        business: {
          name: 'KiteCabana Pousada',
          category: 'hotel',
          description: 'Beachfront pousada.',
          phone: '+55 85 99999-0000',
          email: 'hello@kitecabana.com',
          website: 'https://kitecabana.com/',
          socials: { instagram: 'https://instagram.com/kitecabana', x: 'https://x.com/kitecabana' },
          priceRange: '$$',
          paymentMethods: ['Cash', 'Pix'],
          amenities: ['Pool', 'Kite storage'],
          languages: ['pt', 'en'],
          logoUrl: 'https://cdn.nessa/logo.png',
          coverUrl: 'https://cdn.nessa/biz-cover.jpg',
          address: 'Rua das Dunas, 120',
          checkIn: '14:00',
          checkOut: '11h',
          menuUrl: 'https://kitecabana.com/menu',
          bookingUrl: 'https://kitecabana.com/book',
          openingHours: { mon: [{ opens: '00:00', closes: '24:00' }] },
        },
      },
      CANONICAL,
    )
    assert.equal(ld['@type'], 'Hotel')
    assert.equal(ld.url, CANONICAL)
    assert.equal(ld.name, 'KiteCabana')
    assert.equal(ld.alternateName, 'KiteCabana Pousada')
    assert.equal(ld.description, 'Beachfront pousada.')
    assert.equal(ld.telephone, '+55 85 99999-0000')
    assert.equal(ld.email, 'hello@kitecabana.com')
    assert.deepEqual(ld.sameAs, ['https://kitecabana.com/', 'https://instagram.com/kitecabana', 'https://x.com/kitecabana'])
    assert.equal(ld.priceRange, '$$')
    assert.equal(ld.paymentAccepted, 'Cash, Pix')
    assert.deepEqual(ld.amenityFeature, [
      { '@type': 'LocationFeatureSpecification', name: 'Pool', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Kite storage', value: true },
    ])
    assert.deepEqual(ld.knowsLanguage, ['pt', 'en'])
    assert.equal(ld.logo, 'https://cdn.nessa/logo.png')
    assert.deepEqual(ld.image, ['https://cdn.nessa/biz-cover.jpg', 'https://cdn.nessa/cover.jpg'])
    assert.deepEqual(ld.address, {
      '@type': 'PostalAddress',
      streetAddress: 'Rua das Dunas, 120',
      addressLocality: 'Cumbuco',
      addressCountry: 'Brazil',
    })
    assert.equal(ld.checkinTime, '14:00')
    assert.equal(ld.checkoutTime, '11:00')
    // Hotels don't get hasMenu; everyone with a booking link gets ReserveAction.
    assert.equal(ld.hasMenu, undefined)
    assert.deepEqual((ld.potentialAction as Record<string, unknown>)['@type'], 'ReserveAction')
    assert.equal(
      ((ld.potentialAction as Record<string, unknown>).target as Record<string, unknown>).urlTemplate,
      'https://kitecabana.com/book',
    )
    assert.deepEqual(ld.openingHoursSpecification, [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday'], opens: '00:00', closes: '23:59' },
    ])
  })

  it('food places get hasMenu; lodging-only fields stay off others', () => {
    const ld = buildPlaceJsonLd(
      { name: 'Café', business: { name: 'Café', category: 'cafe', menuUrl: 'https://c.com/menu', checkIn: '14:00' } },
      CANONICAL,
    )
    assert.equal(ld.hasMenu, 'https://c.com/menu')
    assert.equal(ld.checkinTime, undefined)
    const tour = buildPlaceJsonLd({ name: 'T', business: { name: 'T', category: 'tour', menuUrl: 'https://c.com/menu' } }, CANONICAL)
    assert.equal(tour.hasMenu, undefined)
  })

  it('never uses Google covers in JSON-LD', () => {
    const ld = buildPlaceJsonLd(
      { name: 'X', coverImageUrl: 'https://lh3.googleusercontent.com/p/abc', coverSource: 'google' },
      CANONICAL,
    )
    assert.equal(ld.image, undefined)
    const own = buildPlaceJsonLd({ name: 'X', coverImageUrl: 'https://cdn.nessa/c.jpg', coverSource: 'nessa' }, CANONICAL)
    assert.equal(own.image, 'https://cdn.nessa/c.jpg')
  })

  it('parses check-in times', () => {
    assert.equal(parseCheckTime('14:00'), '14:00')
    assert.equal(parseCheckTime('9:30'), '09:30')
    assert.equal(parseCheckTime('14h'), '14:00')
    assert.equal(parseCheckTime('14h30'), '14:30')
    assert.equal(parseCheckTime('from 2pm'), null)
    assert.equal(parseCheckTime(undefined), null)
  })
})

describe('place SEO — openingHoursSpecification', () => {
  it('groups days and handles 24h, 24:00 and after-midnight closing', () => {
    const weekday = [{ opens: '08:00', closes: '22:00' }]
    const hours: OpeningHours = {
      mon: weekday,
      tue: weekday,
      wed: weekday,
      thu: weekday,
      fri: [
        { opens: '08:00', closes: '14:00' },
        { opens: '18:00', closes: '02:00' },
      ],
      sat: [{ opens: '18:00', closes: '24:00' }],
      sun: [{ opens: '00:00', closes: '24:00' }],
    }
    assert.deepEqual(buildOpeningHoursSpecification(hours), [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '08:00',
        closes: '22:00',
      },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday'], opens: '08:00', closes: '14:00' },
      // Past midnight: one entry on the opening day with the earlier closes.
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday'], opens: '18:00', closes: '02:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '18:00', closes: '23:59' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday'], opens: '00:00', closes: '23:59' },
    ])
  })

  it('omits closed days; closing at 00:00 means end of day', () => {
    assert.deepEqual(buildOpeningHoursSpecification(undefined), [])
    assert.deepEqual(buildOpeningHoursSpecification({ sat: [{ opens: '19:00', closes: '00:00' }] }), [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '19:00', closes: '23:59' },
    ])
    // 00:00–00:00 = open all day.
    assert.deepEqual(buildOpeningHoursSpecification({ sat: [{ opens: '00:00', closes: '00:00' }], sun: [{ opens: '00:00', closes: '24:00' }] }), [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
    ])
  })
})

describe('place SEO — breadcrumbs, descriptions, robots', () => {
  it('builds Home → Places → Place', () => {
    assert.deepEqual(buildPlaceBreadcrumbJsonLd({ name: 'KiteCabana' }, CANONICAL), {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.nessachat.com/' },
        { '@type': 'ListItem', position: 2, name: 'Places', item: 'https://www.nessachat.com/places' },
        { '@type': 'ListItem', position: 3, name: 'KiteCabana', item: CANONICAL },
      ],
    })
  })

  it('uses the business description, with the city, within ~155 chars', () => {
    const short = buildPlaceSeoDescription({
      name: 'KiteCabana',
      city: 'Cumbuco',
      country: 'Brazil',
      recommenderCount: 4,
      business: { name: 'KiteCabana', description: 'Beachfront pousada with kite storage.' },
    })
    assert.equal(short, 'KiteCabana in Cumbuco, Brazil. Beachfront pousada with kite storage.')
    // Already mentions the city → used as written.
    assert.equal(
      buildBusinessSeoDescription({
        name: 'KiteCabana',
        city: 'Cumbuco',
        business: { name: 'KiteCabana', description: 'The best pousada in cumbuco.' },
      }),
      'The best pousada in cumbuco.',
    )
    const long = buildPlaceSeoDescription({
      name: 'KiteCabana',
      city: 'Cumbuco',
      business: { name: 'KiteCabana', description: `${'Lovely rooms by the lagoon and the sea. '.repeat(12)}` },
    })
    assert.ok(long.length <= 155, String(long.length))
    assert.ok(long.startsWith('KiteCabana in Cumbuco. Lovely rooms'))
    assert.ok(long.endsWith('…'))
    assert.ok(!/\s…$/.test(long))
    // No business description → previous behavior.
    assert.equal(
      buildPlaceSeoDescription({ name: 'Quiet Spot', city: 'Jeri', business: { name: 'Quiet Spot' } }),
      'Quiet Spot in Jeri. See what travelers say on NessaChat and recommend it.',
    )
  })

  it('applies the indexability rule to robots; no data → noindex', () => {
    assert.deepEqual(placeRobots(null), { index: false, follow: true })
    assert.deepEqual(placeRobots({ recommenderCount: 0, storyCount: 0 }), { index: false, follow: true })
    assert.deepEqual(placeRobots({ storyCount: 1 }), { index: true, follow: true })
    assert.deepEqual(placeRobots({ business: { name: 'KiteCabana' } }), { index: true, follow: true })
  })
})
