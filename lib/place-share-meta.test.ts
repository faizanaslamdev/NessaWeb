import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { PublicPlaceLanding } from './place-landing'
import { mapCallableResult, toSsrSafeLanding } from './place-share-meta'

const PLACE_ID = 'ChIJabc123'

const landing = {
  googlePlaceId: PLACE_ID,
  name: 'KiteCabana',
  placeType: 'Hotel',
  city: 'Cumbuco',
  recommenderCount: 0,
  storyCount: 0,
  visitedCount: 0,
  coverSource: 'google',
  coverImageUrl: 'https://lh3.googleusercontent.com/p/x',
  wifi: { networkName: 'Kite', password: 'secret' },
  business: {
    businessId: 'biz_1',
    verified: true,
    name: 'KiteCabana',
    website: 'javascript:alert(1)',
    bookingUrl: 'https://kitecabana.com/book',
    menuUrl: 'http://kitecabana.com/menu',
    email: 'HELLO@kitecabana.com',
    socials: { instagram: 'https://evil.com/x', facebook: 'https://facebook.com/kitecabana' },
    priceRange: '$$',
    openingHours: { mon: [{ opens: '08:00', closes: '22:00' }], tue: 'always' },
  },
} as unknown as PublicPlaceLanding

describe('place share meta — business fields', () => {
  it('SSR landing keeps only validated business fields and no Wi-Fi', () => {
    const safe = toSsrSafeLanding(landing)
    assert.equal(safe.wifi, undefined)
    assert.deepEqual(safe.business, {
      businessId: 'biz_1',
      verified: true,
      name: 'KiteCabana',
      bookingUrl: 'https://kitecabana.com/book',
      email: 'hello@kitecabana.com',
      socials: { facebook: 'https://facebook.com/kitecabana' },
      priceRange: '$$',
      openingHours: { mon: [{ opens: '08:00', closes: '22:00' }] },
    })
    // The cached original is not mutated.
    assert.ok(landing.wifi)
  })

  it('SSR landing drops an unverified business', () => {
    const safe = toSsrSafeLanding({ ...landing, business: { ...landing.business, verified: false } } as never)
    assert.equal(safe.business, undefined)
  })

  it('share meta carries the sanitized business and the cover source', () => {
    const meta = mapCallableResult(landing)
    assert.ok(meta)
    assert.equal(meta.coverSource, 'google')
    assert.equal(meta.business?.name, 'KiteCabana')
    assert.equal(meta.business?.website, undefined)
    assert.equal(meta.business?.menuUrl, undefined)
    assert.equal('businessId' in (meta.business ?? {}), false)
    assert.deepEqual(meta.business?.openingHours, { mon: [{ opens: '08:00', closes: '22:00' }] })
  })
})
