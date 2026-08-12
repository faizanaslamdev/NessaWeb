import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  detectBrowserAppLanguage,
  resolveAppLanguageCode,
  resolveInitialWebUiLanguage,
} from './web-ui-locale'
import { getPlaceUiCopy } from './place-ui-copy'
import { detectStorePlatform, storesForPlatform } from './store-links'

describe('web-ui-locale', () => {
  it('maps browser locales to supported codes', () => {
    assert.equal(resolveAppLanguageCode('es-MX'), 'es')
    assert.equal(resolveAppLanguageCode('pt-BR'), 'pt')
    assert.equal(resolveAppLanguageCode('fr'), 'fr')
    assert.equal(resolveAppLanguageCode('de-DE'), 'de')
    assert.equal(resolveAppLanguageCode('en-US'), 'en')
  })

  it('falls back to English for unsupported locales', () => {
    assert.equal(resolveAppLanguageCode('xx-YY'), 'en')
    assert.equal(resolveAppLanguageCode(''), 'en')
    assert.equal(detectBrowserAppLanguage(['xx-YY', 'zz']), 'en')
  })

  it('prefers the first supported browser language', () => {
    assert.equal(detectBrowserAppLanguage(['xx', 'pt-BR', 'en']), 'pt')
    assert.equal(detectBrowserAppLanguage(['fr-CA']), 'fr')
  })

  it('prefers stored language over browser', () => {
    assert.equal(
      resolveInitialWebUiLanguage({
        stored: 'de',
        browserLanguages: ['es'],
      }),
      'de',
    )
    assert.equal(
      resolveInitialWebUiLanguage({
        stored: null,
        browserLanguages: ['es-AR'],
      }),
      'es',
    )
  })
})

describe('place-ui-copy', () => {
  it('returns localized Join Live Chat for Spanish', () => {
    assert.equal(getPlaceUiCopy('es').joinLiveChat, 'Unirse al chat en vivo')
  })

  it('falls back to English UI for unsupported UI dictionaries', () => {
    assert.equal(getPlaceUiCopy('ja').joinLiveChat, 'Join Live Chat')
  })
})

describe('store-links', () => {
  it('routes iOS / Android / desktop', () => {
    assert.equal(detectStorePlatform('iPhone'), 'ios')
    assert.equal(detectStorePlatform('Android 14'), 'android')
    assert.equal(detectStorePlatform('Macintosh'), 'desktop')
    assert.equal(storesForPlatform('ios').length, 1)
    assert.equal(storesForPlatform('android')[0]?.name, 'Google Play')
    assert.ok(storesForPlatform('desktop').length >= 2)
  })
})
