import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildHowOthersSeeRows } from './how-others-see'

describe('buildHowOthersSeeRows', () => {
  it('Place: one labeled row per language, not per follower', () => {
    const rows = buildHowOthersSeeRows({
      originalText: 'Hello everyone how are you doing.',
      viewerUserId: 'me',
      translationsByLanguage: { es: 'Hola a todos, ¿cómo están?' },
      translationsByUser: {
        u1: 'Hola a todos, ¿cómo están?',
        u2: 'Hola a todos, ¿cómo están?',
        me: 'Hola a todos, ¿cómo están?',
      },
      translation: 'Hola a todos, ¿cómo están?',
      translationLanguage: 'es',
    })
    assert.deepEqual(rows, [
      {
        key: 'es',
        languageLabel: 'ES',
        text: 'Hola a todos, ¿cómo están?',
      },
    ])
  })

  it('Instant: dedupes same-language recipients and labels from member language', () => {
    const rows = buildHowOthersSeeRows({
      originalText: 'Hello',
      viewerUserId: 'me',
      translationsByUser: { a: 'Hola', b: 'Hola', c: 'Olá' },
      recipientLanguages: { a: 'es', b: 'es', c: 'pt', me: 'en' },
    })
    assert.deepEqual(rows, [
      { key: 'a', languageLabel: 'ES', text: 'Hola' },
      { key: 'c', languageLabel: 'PT', text: 'Olá' },
    ])
  })

  it('Instant 1:1: uses legacy translation + language label', () => {
    const rows = buildHowOthersSeeRows({
      originalText: 'Hello',
      viewerUserId: 'me',
      translation: 'Hola',
      translationLanguage: 'es',
    })
    assert.deepEqual(rows, [
      { key: 'legacy', languageLabel: 'ES', text: 'Hola' },
    ])
  })

  it('skips translations that match the original text', () => {
    const rows = buildHowOthersSeeRows({
      originalText: 'Hello',
      translationsByUser: { a: 'Hello', b: 'Hola' },
      recipientLanguages: { a: 'en', b: 'es' },
    })
    assert.deepEqual(rows, [{ key: 'b', languageLabel: 'ES', text: 'Hola' }])
  })
})
