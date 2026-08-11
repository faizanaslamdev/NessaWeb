import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  normalizePlaceChatLanguage,
  placeChatTranslationsByUserForBubble,
  resolvePlaceChatViewerTranslation,
  selectPlaceChatMessagesNeedingBackfill,
} from './translation'

describe('placeChat translation resolve', () => {
  it('resolves by user then language then legacy', () => {
    const msg = {
      text: 'Hello',
      translationsByUser: { u1: 'Hola-user' },
      translationsByLanguage: { es: 'Hola-lang', pt: 'Olá' },
      translation: 'Bonjour',
      translationLanguage: 'fr',
    }
    assert.equal(resolvePlaceChatViewerTranslation(msg, 'u1', 'es'), 'Hola-user')
    assert.equal(resolvePlaceChatViewerTranslation(msg, 'u2', 'es'), 'Hola-lang')
    assert.equal(resolvePlaceChatViewerTranslation(msg, 'u2', 'pt'), 'Olá')
    assert.equal(resolvePlaceChatViewerTranslation(msg, 'u2', 'fr'), 'Bonjour')
    assert.equal(resolvePlaceChatViewerTranslation(msg, 'u2', 'de'), undefined)
  })

  it('merges language cache into bubble map for the viewer', () => {
    const merged = placeChatTranslationsByUserForBubble(
      {
        text: 'Hello',
        translationsByLanguage: { es: 'Hola' },
        translationsByUser: { other: 'Olá' },
      },
      'me',
      'es',
    )
    assert.deepEqual(merged, { other: 'Olá', me: 'Hola' })
  })

  it('normalizes language codes', () => {
    assert.equal(normalizePlaceChatLanguage(' PT '), 'pt')
  })

  it('selects late-join backfill candidates', () => {
    const ids = selectPlaceChatMessagesNeedingBackfill(
      [
        {
          id: 'a',
          text: 'Hi',
          sourceLanguage: 'en',
          translationsByLanguage: { es: 'Hola' },
        },
        { id: 'b', text: 'Hi', sourceLanguage: 'en' },
        { id: 'c', text: 'Hi', sourceLanguage: 'de' },
      ],
      'de',
    )
    assert.deepEqual(ids, ['a', 'b'])
  })
})
