import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  filterRecentPlaceChatViewers,
  isPlaceChatViewerRecentlyActive,
  mapPlaceChatViewerPrefDoc,
} from './viewers'

describe('placeChat viewers', () => {
  it('maps public display fields only', () => {
    const v = mapPlaceChatViewerPrefDoc({
      uid: 'u1',
      language: 'es',
      displayName: 'Ana',
      updatedAtMs: 1000,
    })
    assert.deepEqual(v, {
      uid: 'u1',
      displayName: 'Ana',
      language: 'es',
      updatedAtMs: 1000,
    })
  })

  it('filters to recent active window', () => {
    const now = 10_000_000
    const list = filterRecentPlaceChatViewers(
      [
        {
          uid: 'a',
          displayName: 'A',
          language: 'en',
          updatedAtMs: now - 1000,
        },
        {
          uid: 'b',
          displayName: 'B',
          language: 'es',
          updatedAtMs: now - 3 * 60 * 60 * 1000,
        },
      ],
      now,
      2 * 60 * 60 * 1000,
    )
    assert.equal(list.length, 1)
    assert.equal(list[0].uid, 'a')
    assert.equal(isPlaceChatViewerRecentlyActive(now - 1000, now), true)
  })
})
