import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPlaceJsonLd,
  buildPlaceSeoDescription,
  buildPlaceSeoTitle,
  isPlaceIndexable,
  schemaTypeForPlaceType,
  serializeJsonLd,
} from './place-seo'

describe('place SEO', () => {
  it('titles include the city once', () => {
    assert.equal(
      buildPlaceSeoTitle({ name: 'KiteCabana', city: 'Cumbuco' }),
      'KiteCabana, Cumbuco | Nessa',
    )
    assert.equal(
      buildPlaceSeoTitle({ name: 'Lahore Fort', city: 'Lahore' }),
      'Lahore Fort | Nessa',
    )
    assert.equal(buildPlaceSeoTitle({ name: '' }), 'Place on Nessa')
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
      'KiteCabana (hotel) in Cumbuco, Brazil. See 12 traveler recommendations and 1 story on Nessa.',
    )
    const empty = buildPlaceSeoDescription({ name: 'Quiet Spot', city: 'Jeri' })
    assert.equal(empty, 'Quiet Spot in Jeri. See what travelers say on Nessa and recommend it.')
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
