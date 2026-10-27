import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { describeChatAuditEntry, parsePlaceRef, type PlaceChatAuditEntry } from './admin-chats'

const ID = 'ChIJabc123_-XYZ'

describe('admin chats helpers', () => {
  it('parsePlaceRef accepts IDs, Place and Place Chat links, and slugs', () => {
    assert.deepEqual(parsePlaceRef(` ${ID} `), { kind: 'placeId', placeId: ID })
    assert.deepEqual(parsePlaceRef(`https://www.nessachat.com/place/${ID}?ref=qr`), {
      kind: 'placeId',
      placeId: ID,
    })
    assert.deepEqual(parsePlaceRef(`nessachat.com/place/${ID}/chat`), { kind: 'placeId', placeId: ID })
    assert.deepEqual(parsePlaceRef('https://www.nessachat.com/places/cumbuco-beach/chat'), {
      kind: 'slug',
      slug: 'cumbuco-beach',
    })
    assert.deepEqual(parsePlaceRef('/places/cumbuco-beach'), { kind: 'slug', slug: 'cumbuco-beach' })
    assert.deepEqual(parsePlaceRef('cumbuco-beach'), { kind: 'slug', slug: 'cumbuco-beach' })
    assert.equal(parsePlaceRef(''), null)
    assert.equal(parsePlaceRef('https://example.com/place/not-an-id'), null)
    assert.equal(parsePlaceRef('https://example.com/about'), null)
    assert.equal(parsePlaceRef('Not A Slug!'), null)
  })

  it('describeChatAuditEntry', () => {
    const entry: PlaceChatAuditEntry = {
      id: 'a',
      action: 'retention_change',
      targetType: 'place_chat',
      targetId: ID,
      targetLabel: 'Cumbuco Chat',
      details: { previousHours: 24, hours: 168 },
      actorUid: 'u',
      actorEmail: 'ops@nessa.test',
      note: null,
      at: null,
    }
    assert.equal(describeChatAuditEntry(entry), 'ops@nessa.test changed Cumbuco Chat from 24 hours to 7 days')
  })
})
