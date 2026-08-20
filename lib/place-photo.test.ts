import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
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
