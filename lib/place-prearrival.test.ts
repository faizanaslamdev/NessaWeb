import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPrearrivalCopy } from './place-prearrival'

describe('pre-arrival copy', () => {
  it('produces WhatsApp, booking and email variants that all carry the links', () => {
    const items = buildPrearrivalCopy({
      placeName: 'KiteCabana',
      placeUrl: 'https://www.nessachat.com/place/ChIJabc?ref=pre',
      chatUrl: 'https://www.nessachat.com/place/ChIJabc/chat?ref=pre',
    })
    assert.deepEqual(
      items.map(i => i.channel),
      ['whatsapp', 'booking', 'email'],
    )
    for (const item of items) {
      assert.ok(item.text.includes('KiteCabana'), item.channel)
      assert.ok(item.text.includes('/chat?ref=pre'), item.channel)
    }
    assert.ok(items[2]!.text.startsWith('Subject: '))
  })

  it('falls back to a generic name', () => {
    const [wa] = buildPrearrivalCopy({ placeName: '  ', placeUrl: 'u', chatUrl: 'c' })
    assert.ok(wa!.text.includes('our place'))
  })
})
