import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { splitList } from './business'

describe('splitList', () => {
  it('splits on commas/newlines, trims and dedupes', () => {
    assert.deepEqual(splitList('Wi-Fi, Pool,\n Pool , , Kite storage'), ['Wi-Fi', 'Pool', 'Kite storage'])
    assert.deepEqual(splitList(''), [])
  })
})
