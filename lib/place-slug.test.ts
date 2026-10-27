import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  PLACE_LINKS_USE_LEGACY_ID_PATH,
  isValidPlaceSlug,
  placeChatCanonicalPath,
  placeChatOutboundUrl,
  placeChatPublicUrl,
  placeOutboundUrl,
  placeQrUrl,
  placeCanonicalUrlForSlug,
  placePublicUrl,
  searchParamsToQueryString,
} from './place-slug'

describe('place slug URLs', () => {
  it('validates slugs like the backend does', () => {
    assert.equal(isValidPlaceSlug('kitecabana-cumbuco'), true)
    assert.equal(isValidPlaceSlug('kitecabana-cumbuco-2'), true)
    for (const bad of ['', 'a', 'KiteCabana', 'kite--cabana', '-kite', 'ChIJabc', 'kite_cabana']) {
      assert.equal(isValidPlaceSlug(bad), false, bad)
    }
  })

  it('builds the canonical URL', () => {
    assert.equal(
      placeCanonicalUrlForSlug('kitecabana-cumbuco'),
      'https://www.nessachat.com/places/kitecabana-cumbuco',
    )
  })

  it('prefers the slug and falls back to the legacy id URL', () => {
    assert.equal(
      placePublicUrl({ placeId: 'ChIJabc123', slug: 'kitecabana-cumbuco' }),
      'https://www.nessachat.com/places/kitecabana-cumbuco',
    )
    assert.equal(
      placePublicUrl({ placeId: 'ChIJabc123', slug: null }),
      'https://www.nessachat.com/place/ChIJabc123',
    )
    assert.equal(
      placePublicUrl({ placeId: 'ChIJabc123', slug: 'Not Valid' }),
      'https://www.nessachat.com/place/ChIJabc123',
    )
  })

  it('appends tracking params only when asked', () => {
    assert.equal(
      placePublicUrl({ placeId: 'ChIJabc123', slug: 'kitecabana-cumbuco' }, { ref: 'qr', qrId: 'table-4' }),
      'https://www.nessachat.com/places/kitecabana-cumbuco?ref=qr&qr=table-4',
    )
  })

  it('QR URLs are always tagged ref=qr; legacy id path while the switch is on', () => {
    const place = { placeId: 'ChIJabc123', slug: 'kitecabana-cumbuco' }
    assert.equal(PLACE_LINKS_USE_LEGACY_ID_PATH, true)
    assert.equal(placeQrUrl(place), 'https://www.nessachat.com/place/ChIJabc123?ref=qr')
    assert.equal(
      placeQrUrl(place, { useLegacyIdPath: false, qrId: 'table-4' }),
      'https://www.nessachat.com/places/kitecabana-cumbuco?ref=qr&qr=table-4',
    )
    assert.equal(
      placeQrUrl({ placeId: 'ChIJabc123', slug: null }, { useLegacyIdPath: false }),
      'https://www.nessachat.com/place/ChIJabc123?ref=qr',
    )
  })

  it('Share / Copy Link use the legacy id path while the switch is on', () => {
    const place = { placeId: 'ChIJabc123', slug: 'kitecabana-cumbuco' }
    assert.equal(placeOutboundUrl(place), 'https://www.nessachat.com/place/ChIJabc123')
    assert.equal(
      placeOutboundUrl(place, { useLegacyIdPath: false }),
      'https://www.nessachat.com/places/kitecabana-cumbuco',
    )
    // Display stays canonical regardless of the switch.
    assert.equal(placePublicUrl(place), 'https://www.nessachat.com/places/kitecabana-cumbuco')
  })

  it('builds Place Chat URLs following the same legacy-path switch', () => {
    const place = { placeId: 'ChIJabc123', slug: 'kitecabana-cumbuco' }
    assert.equal(placeChatCanonicalPath('kitecabana-cumbuco'), '/places/kitecabana-cumbuco/chat')
    assert.equal(
      placeChatOutboundUrl(place, { ref: 'qr', qrId: 'bar' }),
      'https://www.nessachat.com/place/ChIJabc123/chat?ref=qr&qr=bar',
    )
    assert.equal(
      placeChatOutboundUrl(place, { ref: 'pre', useLegacyIdPath: false }),
      'https://www.nessachat.com/places/kitecabana-cumbuco/chat?ref=pre',
    )
    assert.equal(
      placeChatOutboundUrl({ placeId: 'ChIJabc123', slug: null }, { useLegacyIdPath: false }),
      'https://www.nessachat.com/place/ChIJabc123/chat',
    )
  })

  it('rebuilds query strings for redirects', () => {
    assert.equal(searchParamsToQueryString(undefined), '')
    assert.equal(searchParamsToQueryString({}), '')
    assert.equal(
      searchParamsToQueryString({ ref: 'qr', tag: ['a', 'b'], empty: undefined }),
      '?ref=qr&tag=a&tag=b',
    )
  })
})

describe('placeChatPublicUrl (text shown under a Live chat QR)', () => {
  it('is the clean /places/{slug}/chat URL when the Place has a slug', () => {
    assert.equal(
      placeChatPublicUrl({ placeId: 'ChIJv75cmffLwAcRoCN_2XtSDlg', slug: 'cumbuco' }),
      'https://www.nessachat.com/places/cumbuco/chat',
    )
  })

  it('falls back to the legacy chat path without a valid slug, and never carries tracking params', () => {
    assert.equal(
      placeChatPublicUrl({ placeId: 'ChIJabc123', slug: null }),
      'https://www.nessachat.com/place/ChIJabc123/chat',
    )
    assert.equal(
      placeChatPublicUrl({ placeId: 'ChIJabc123', slug: 'Not Valid' }),
      'https://www.nessachat.com/place/ChIJabc123/chat',
    )
  })
})
