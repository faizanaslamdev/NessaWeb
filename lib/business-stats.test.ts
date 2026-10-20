import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { percentLabel, qrPlacementLabel, statRows, summaryTiles } from './business-stats'

describe('business stats presentation', () => {
  it('statRows sorts by count, labels known sources and computes shares', () => {
    const rows = statRows({ direct: 1, qr: 3, mystery: 0, instagram: 1 })
    assert.deepEqual(rows.map(r => [r.key, r.label, r.count]), [
      ['qr', 'QR codes', 3],
      ['direct', 'Direct / typed', 1],
      ['instagram', 'Instagram', 1],
    ])
    assert.equal(rows[0].share, 0.6)
    assert.deepEqual(statRows({}), [])
  })

  it('qrPlacementLabel / percentLabel', () => {
    assert.equal(qrPlacementLabel('reception'), 'Reception')
    assert.equal(qrPlacementLabel('room-12'), 'Room 12')
    assert.equal(qrPlacementLabel('front_door'), 'Front door')
    assert.equal(percentLabel(0.6), '60%')
    assert.equal(percentLabel(0.004), '<1%')
    assert.equal(percentLabel(0), '0%')
  })

  it('summaryTiles reads visits, chat joins and the QR share', () => {
    const tiles = summaryTiles({
      days: 7,
      visits: 10,
      visitors: { new: 7, returning: 3 },
      sources: { qr: 4, direct: 6 },
      qrCodes: { reception: 4 },
      chatJoins: { total: 2, sources: { qr: 2 } },
      activeDays: 3,
    })
    assert.deepEqual(tiles.map(t => [t.label, t.value]), [['Page visits', 10], ['Chat joins', 2], ['From QR codes', 4]])
    assert.equal(tiles[0].hint, '7 new · 3 returning')
    assert.equal(tiles[2].hint, '40% of visits')
  })
})
