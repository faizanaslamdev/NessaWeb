import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatPlaceChatMessageTime,
  placeChatRetentionHint,
  placeChatRetentionLabel,
  resolvePlaceChatRetentionHours,
} from './retention'

describe('place chat retention (web)', () => {
  it('resolves presets and falls back to 24h', () => {
    assert.equal(resolvePlaceChatRetentionHours(168), 168)
    assert.equal(resolvePlaceChatRetentionHours(undefined), 24)
    assert.equal(resolvePlaceChatRetentionHours(100), 24)
    assert.equal(resolvePlaceChatRetentionHours('168'), 24)
  })

  it('labels', () => {
    assert.equal(placeChatRetentionLabel(24), '24 hours')
    assert.equal(placeChatRetentionLabel(72), '3 days')
    assert.equal(placeChatRetentionLabel(168), '7 days')
    assert.equal(placeChatRetentionLabel(720), '30 days')
    assert.equal(placeChatRetentionLabel(5), '24 hours')
    assert.equal(
      placeChatRetentionHint(168),
      'Messages disappear after 7 days. The room stays open.',
    )
  })

  it('message time shows a day once the message is not from today', () => {
    const now = new Date(2026, 9, 27, 15, 0).getTime()
    const today = formatPlaceChatMessageTime(new Date(2026, 9, 27, 9, 5).getTime(), now, 'en-US')
    const twoDays = formatPlaceChatMessageTime(new Date(2026, 9, 25, 9, 5).getTime(), now, 'en-US')
    const old = formatPlaceChatMessageTime(new Date(2026, 9, 3, 9, 5).getTime(), now, 'en-US')
    assert.match(today, /^09:05/)
    assert.match(twoDays, /^Sun 09:05/)
    assert.match(old, /^Oct 3, 09:05/)
    assert.equal(formatPlaceChatMessageTime(0, now), '')
  })
})
