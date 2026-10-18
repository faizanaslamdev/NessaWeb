import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isValidPlaceSlug,
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

  it('rebuilds query strings for redirects', () => {
    assert.equal(searchParamsToQueryString(undefined), '')
    assert.equal(searchParamsToQueryString({}), '')
    assert.equal(
      searchParamsToQueryString({ ref: 'qr', tag: ['a', 'b'], empty: undefined }),
      '?ref=qr&tag=a&tag=b',
    )
  })
})
