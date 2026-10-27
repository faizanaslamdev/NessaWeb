import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { placeShareUrl } from './constants'
import {
  buildPlaceShareMessage,
  buildPlaceShareText,
  placeQrFilename,
  qrPlacementIdFromLabel,
  slugPlaceQrName,
} from './place-qr'

describe('place QR / share helpers', () => {
  it('builds the canonical www Place URL', () => {
    assert.equal(
      placeShareUrl('ChIJtestPlaceId0001abc'),
      'https://www.nessachat.com/place/ChIJtestPlaceId0001abc',
    )
  })

  it('slugs download filenames', () => {
    assert.equal(
      slugPlaceQrName('Dunas Beach Bar e Restaurante'),
      'dunas-beach-bar-e-restaurante',
    )
    assert.equal(
      placeQrFilename('Dunas Beach Bar e Restaurante'),
      'nessa-dunas-beach-bar-e-restaurante-qr.png',
    )
  })

  it('adds the QR placement to the filename', () => {
    assert.equal(
      placeQrFilename('Dunas Beach Bar', 'chat-bar 2'),
      'nessa-dunas-beach-bar-chat-bar-2-qr.png',
    )
    assert.equal(placeQrFilename('Dunas Beach Bar', ''), 'nessa-dunas-beach-bar-qr.png')
  })

  it('builds share text with the URL', () => {
    const url = placeShareUrl('ChIJabc')
    assert.equal(
      buildPlaceShareMessage('Dunas Beach Bar e Restaurante'),
      'Check out Dunas Beach Bar e Restaurante on Nessa',
    )
    assert.equal(
      buildPlaceShareText('Dunas Beach Bar e Restaurante', url),
      `Check out Dunas Beach Bar e Restaurante on Nessa\n${url}`,
    )
  })

  it('qrPlacementIdFromLabel matches the backend rule', () => {
    assert.equal(qrPlacementIdFromLabel('Reception desk'), 'reception-desk')
    assert.equal(qrPlacementIdFromLabel('Room_12'), 'room-12')
    assert.equal(qrPlacementIdFromLabel('  Bar   2 '), 'bar-2')
    assert.equal(qrPlacementIdFromLabel('Recepção'), 'recepcao')
    assert.equal(qrPlacementIdFromLabel('Café — Terraço!'), 'cafe-terraco')
    assert.equal(qrPlacementIdFromLabel('!!!'), null)
    assert.equal(qrPlacementIdFromLabel('-'), null)
    assert.equal(qrPlacementIdFromLabel('x'.repeat(40))?.length, 32)
  })
})
