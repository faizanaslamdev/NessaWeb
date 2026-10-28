import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isNessaPhotoUrl,
  nessaCoverUrl,
  placePhotoUrlForWebVariant,
  WEB_PLACE_PHOTO_MAX_PX,
} from './place-photo'

describe('web place photo sizing', () => {
  const google =
    'https://places.googleapis.com/v1/places/ChIJ/photos/abc/media?maxHeightPx=800&maxWidthPx=800&key=secret'

  it('uses 480 for landing and 800 for lightbox', () => {
    const landing = placePhotoUrlForWebVariant(google, 'landing')
    const lightbox = placePhotoUrlForWebVariant(google, 'lightbox')
    assert.ok(landing?.includes('maxWidthPx=480'))
    assert.ok(landing?.includes('maxHeightPx=480'))
    assert.ok(lightbox?.includes('maxWidthPx=800'))
    assert.equal(WEB_PLACE_PHOTO_MAX_PX.landing, 480)
    assert.equal(WEB_PLACE_PHOTO_MAX_PX.lightbox, 800)
  })

  it('preserves API key on ephemeral URLs', () => {
    const landing = placePhotoUrlForWebVariant(google, 'landing')
    assert.ok(landing?.includes('key=secret'))
  })
})

describe('NessaChat photos vs Google photos', () => {
  const own = 'https://firebasestorage.googleapis.com/v0/b/nessa-86e2f.firebasestorage.app/o/places%2Fx%2Fmaster.jpg?alt=media&token=t'
  const google = 'https://places.googleapis.com/v1/places/x/photos/y/media?maxWidthPx=800&key=K'
  it('recognises our own Storage URLs only', () => {
    assert.equal(isNessaPhotoUrl(own), true)
    assert.equal(isNessaPhotoUrl('http://127.0.0.1:9199/v0/b/demo/o/x'), true)
    assert.equal(isNessaPhotoUrl(google), false)
    assert.equal(isNessaPhotoUrl('https://evil.example/v0/b/x'), false)
    assert.equal(isNessaPhotoUrl(undefined), false)
  })
  it('dashboards and previews only use a NessaChat cover', () => {
    assert.equal(nessaCoverUrl({ coverImageUrl: own, coverSource: 'nessa' }), own)
    assert.equal(nessaCoverUrl({ coverImageUrl: own, coverFeedUrl: own + '&f', coverSource: 'nessa' }, true), own + '&f')
    assert.equal(nessaCoverUrl({ coverImageUrl: google, coverSource: 'google' }), null)
    assert.equal(nessaCoverUrl({ coverImageUrl: google }), null)
    assert.equal(nessaCoverUrl(null), null)
  })
})
