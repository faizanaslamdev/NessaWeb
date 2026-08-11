import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveWebChatKind } from './resolve-chat-kind'

describe('resolveWebChatKind', () => {
  const placeId = 'ChIJs52I_Z2N9gcR1KyocuPOvSc'
  const instantId = 'abcdefghijkl'

  it('routes Google Place ID to place', () => {
    assert.deepEqual(resolveWebChatKind(placeId), {
      kind: 'place',
      roomId: placeId,
      placeId,
    })
  })

  it('routes nanoid to instant', () => {
    assert.deepEqual(resolveWebChatKind(instantId), {
      kind: 'instant',
      roomId: instantId,
    })
  })

  it('does not let type=place convert an Instant room id', () => {
    const search = new URLSearchParams('type=place')
    assert.equal(resolveWebChatKind(instantId, search).kind, 'error')
  })

  it('accepts matching placeId query with Place path', () => {
    const search = new URLSearchParams(`type=place&placeId=${placeId}`)
    assert.equal(resolveWebChatKind(placeId, search).kind, 'place')
  })

  it('rejects mismatched placeId query', () => {
    const search = new URLSearchParams('placeId=ChIJaaaaaaaaaaaaaaaaaaaaaa')
    assert.equal(resolveWebChatKind(placeId, search).kind, 'error')
  })

  it('ignores type=instant on a Place path (still place)', () => {
    const search = new URLSearchParams('type=instant')
    assert.deepEqual(resolveWebChatKind(placeId, search), {
      kind: 'place',
      roomId: placeId,
      placeId,
    })
  })
})
