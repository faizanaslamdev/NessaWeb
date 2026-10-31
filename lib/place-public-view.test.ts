import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { PublicPlaceLanding } from './place-landing'
import { hasNessaCover, placeHeroImage, placeShareImageUrl, toPublicPlaceView } from './place-public-view'

const OURS = 'https://firebasestorage.googleapis.com/v0/b/nessa/o/places%2Fx.jpg?alt=media&token=t'
const GOOGLE = 'https://places.googleapis.com/v1/places/ChIJx/photos/AU/media?maxWidthPx=800&key=AIza'

const base: PublicPlaceLanding = {
  googlePlaceId: 'ChIJabc',
  name: 'Café',
  placeType: 'Café',
  city: 'São Luís',
  country: 'Brazil',
  recommenderCount: 1,
  storyCount: 0,
  visitedCount: 0,
}

describe('public Place view', () => {
  it('recognises our own cover only', () => {
    assert.equal(hasNessaCover({ coverImageUrl: OURS, coverSource: 'nessa' }), true)
    assert.equal(hasNessaCover({ coverImageUrl: OURS }), true)
    assert.equal(hasNessaCover({ coverImageUrl: GOOGLE, coverSource: 'google' }), false)
    assert.equal(hasNessaCover({ coverImageUrl: 'https://lh3.googleusercontent.com/p/x' }), false)
    assert.equal(hasNessaCover({}), false)
  })

  it('drops Google media, attribution, address and Wi-Fi details', () => {
    const view = toPublicPlaceView({
      ...base,
      coverImageUrl: GOOGLE,
      coverSource: 'google',
      googlePhotoAttribution: { authors: [{ displayName: 'Ana' }] },
      formattedAddress: 'Rua X',
      wifi: { networkName: 'n', password: 'p' },
    })
    assert.deepEqual(view, { ...base, hasWifi: true })
  })

  it('keeps our cover and its credit', () => {
    const view = toPublicPlaceView({ ...base, coverImageUrl: OURS, coverSource: 'nessa', coverCredit: 'Ana', coverFeedUrl: OURS })
    assert.equal(view.coverImageUrl, OURS)
    assert.equal(view.coverCredit, 'Ana')
    assert.equal(view.coverFeedUrl, OURS)
    assert.equal(view.hasWifi, undefined)
  })
})

describe('Place hero and share image', () => {
  const business = { name: 'Café Co', coverUrl: 'https://cdn.example.com/cover.jpg', logoUrl: 'https://cdn.example.com/logo.png' }

  it('prefers our photo, then the business cover, then its logo, then nothing', () => {
    assert.deepEqual(placeHeroImage({ coverImageUrl: OURS, coverSource: 'nessa', coverCredit: 'Ana', business }), {
      kind: 'photo',
      url: OURS,
      credit: 'Ana',
    })
    assert.deepEqual(placeHeroImage({ business }), { kind: 'business-cover', url: business.coverUrl })
    assert.deepEqual(placeHeroImage({ business: { ...business, coverUrl: undefined } }), {
      kind: 'logo',
      url: business.logoUrl,
      name: 'Café Co',
    })
    assert.deepEqual(placeHeroImage({ business: { name: 'x', logoUrl: 'http://insecure/logo.png' } }), { kind: 'none' })
    assert.deepEqual(placeHeroImage({}), { kind: 'none' })
  })

  it('never uses a Google photo for the hero or share image', () => {
    assert.deepEqual(placeHeroImage({ coverImageUrl: GOOGLE, coverSource: 'google' }), { kind: 'none' })
    assert.equal(placeShareImageUrl({ coverImageUrl: 'https://lh3.googleusercontent.com/p/x', coverSource: 'google' }), null)
    assert.equal(placeShareImageUrl({ coverImageUrl: GOOGLE }), null)
    assert.equal(placeShareImageUrl({ coverImageUrl: OURS, coverSource: 'nessa' }), OURS)
    assert.equal(placeShareImageUrl({ business: { coverUrl: business.coverUrl } }), business.coverUrl)
  })
})
