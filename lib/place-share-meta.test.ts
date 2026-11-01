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
  formattedAddress: 'Rua X, 123 - Cumbuco, CE, Brazil',
  googlePhotoAttribution: { authors: [{ displayName: 'Ana', uri: 'https://maps.google.com/maps/contrib/1' }], googleMapsUri: 'https://maps.google.com/x' },
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
    assert.equal('wifi' in safe, false)
    assert.equal(safe.hasWifi, true)
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

  it('SSR landing carries no Google photo URL or attribution, only flags', () => {
    const safe = toSsrSafeLanding(landing)
    assert.equal(safe.coverImageUrl, undefined)
    assert.equal(safe.coverSource, undefined)
    assert.equal(safe.googlePhoto, true)
    assert.equal('googlePhotoAttribution' in safe, false)
    assert.equal(/googleusercontent|maps\.google/.test(JSON.stringify(safe)), false)
    // The stored address is shown as before (with a Google Maps credit).
    assert.equal(safe.formattedAddress, 'Rua X, 123 - Cumbuco, CE, Brazil')
  })

  it('SSR landing keeps a key-bearing Google cover out but still flags it', () => {
    const keyed = 'https://places.googleapis.com/v1/places/ChIJabc/photos/AU/media?maxWidthPx=800&key=AIzaSECRET'
    const safe = toSsrSafeLanding({ ...landing, coverImageUrl: keyed } as never)
    assert.equal(safe.googlePhoto, true)
    assert.equal(JSON.stringify(safe).includes('AIza'), false)
  })

  it('SSR landing keeps our own cover', () => {
    const ours = 'https://firebasestorage.googleapis.com/v0/b/nessa/o/places%2Fx.jpg?alt=media&token=t'
    const safe = toSsrSafeLanding({ ...landing, coverSource: 'nessa', coverImageUrl: ours, coverCredit: 'Ana' } as never)
    assert.equal(safe.coverImageUrl, ours)
    assert.equal(safe.coverCredit, 'Ana')
  })

  it('share meta never keeps a Google cover (even without an API key)', () => {
    const meta = mapCallableResult(landing)
    assert.ok(meta)
    assert.equal(meta.coverImageUrl, undefined)
    assert.equal(meta.coverSource, undefined)
    const ours = 'https://firebasestorage.googleapis.com/v0/b/nessa/o/places%2Fx.jpg?alt=media&token=t'
    const nessa = mapCallableResult({ ...landing, coverSource: 'nessa', coverImageUrl: ours })
    assert.equal(nessa?.coverImageUrl, ours)
    assert.equal(nessa?.coverSource, 'nessa')
  })

  it('share meta carries the sanitized business', () => {
    const meta = mapCallableResult(landing)
    assert.ok(meta)
    assert.equal(meta.business?.name, 'KiteCabana')
    assert.equal(meta.business?.website, undefined)
    assert.equal(meta.business?.menuUrl, undefined)
    assert.equal('businessId' in (meta.business ?? {}), false)
    assert.deepEqual(meta.business?.openingHours, { mon: [{ opens: '08:00', closes: '22:00' }] })
  })
})
