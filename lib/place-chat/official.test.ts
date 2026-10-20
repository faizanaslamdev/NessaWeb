import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { officialSenderBadge } from './official'

describe('officialSenderBadge', () => {
  it('is undefined unless the server marked the message official', () => {
    assert.equal(officialSenderBadge({}), undefined)
    assert.equal(officialSenderBadge({ official: false, businessName: 'X' }), undefined)
    // A client cannot promote itself with a name alone.
    assert.equal(officialSenderBadge({ businessName: 'KiteCabana' }), undefined)
  })

  it('shows the business name and truncates long ones', () => {
    assert.equal(officialSenderBadge({ official: true, businessName: 'KiteCabana Pousada' }), 'KiteCabana Pousada · Official')
    assert.equal(officialSenderBadge({ official: true }), 'Official')
    assert.equal(
      officialSenderBadge({ official: true, businessName: 'A very long business name that keeps going' }),
      'A very long business name t… · Official',
    )
  })
})
