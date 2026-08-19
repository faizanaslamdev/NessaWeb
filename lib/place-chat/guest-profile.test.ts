import assert from 'node:assert/strict'
import { afterEach, before, describe, it } from 'node:test'

import {
  persistPlaceChatGuestProfile,
  readStoredGuestLanguage,
  readStoredGuestName,
} from './guest-profile'

const storage = new Map<string, string>()

before(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    },
  })
})

describe('placeChat guest profile', () => {
  afterEach(() => {
    storage.clear()
  })

  it('persists display name and language to existing localStorage keys', () => {
    const saved = persistPlaceChatGuestProfile('  Faizan  ', 'es')
    assert.deepEqual(saved, { displayName: 'Faizan', language: 'es' })
    assert.equal(readStoredGuestName(), 'Faizan')
    assert.equal(readStoredGuestLanguage(), 'es')
  })

  it('rejects empty display names', () => {
    assert.equal(persistPlaceChatGuestProfile('   ', 'en'), null)
    assert.equal(readStoredGuestName(), '')
  })

  it('normalizes unknown language codes to default', () => {
    const saved = persistPlaceChatGuestProfile('Guest', 'xx')
    assert.equal(saved?.language, 'en')
    assert.equal(readStoredGuestLanguage(), 'en')
  })
})
