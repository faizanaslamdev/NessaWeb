import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isNessaPhotoUrl,
  nessaCoverUrl,
} from './place-photo'

describe('NessaChat photos vs Google photos', () => {
  const own = 'https://firebasestorage.googleapis.com/v0/b/nessa-86e2f.firebasestorage.app/o/places%2Fx%2Fmaster.jpg?alt=media&token=t'
  const google = 'https://places.googleapis.com/v1/places/x/photos/y/media?maxWidthPx=800&key=K'
  it('recognises our own Storage URLs only', () => {
    assert.equal(isNessaPhotoUrl(own), true)
    assert.equal(isNessaPhotoUrl('http://127.0.0.1:9199/v0/b/demo/o/x'), true)
    assert.equal(isNessaPhotoUrl(google), false)
    assert.equal(isNessaPhotoUrl('https://evil.example/v0/b/x'), false)
    assert.equal(isNessaPhotoUrl(undefined), false)
  })
  it('dashboards and previews only use a NessaChat cover', () => {
    assert.equal(nessaCoverUrl({ coverImageUrl: own, coverSource: 'nessa' }), own)
    assert.equal(nessaCoverUrl({ coverImageUrl: own, coverFeedUrl: own + '&f', coverSource: 'nessa' }, true), own + '&f')
    assert.equal(nessaCoverUrl({ coverImageUrl: google, coverSource: 'google' }), null)
    assert.equal(nessaCoverUrl({ coverImageUrl: google }), null)
    assert.equal(nessaCoverUrl(null), null)
  })
})
