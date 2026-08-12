import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPlacePageTitle } from './place-title'

describe('buildPlacePageTitle', () => {
  it('uses the Place name when present', () => {
    assert.equal(
      buildPlacePageTitle('Dunas Beach Bar e Restaurante'),
      'Dunas Beach Bar e Restaurante | Nessa',
    )
  })

  it('falls back when the name is missing', () => {
    assert.equal(buildPlacePageTitle('  '), 'Place on Nessa')
    assert.equal(buildPlacePageTitle(undefined), 'Place on Nessa')
  })
})
