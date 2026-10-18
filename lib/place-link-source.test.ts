import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  classifyPlaceLinkSource,
  sanitizeQrId,
  stripPlaceTrackingParams,
} from './place-link-source'

function classify(query: string, referrer = '') {
  return classifyPlaceLinkSource({
    searchParams: new URLSearchParams(query),
    referrer,
  })
}

describe('classifyPlaceLinkSource', () => {
  it('uses ref first', () => {
    assert.deepEqual(classify('ref=qr&qr=Table-4'), { source: 'qr', qrId: 'table-4' })
    assert.deepEqual(classify('ref=ig'), { source: 'instagram', qrId: null })
    assert.deepEqual(classify('ref=site'), { source: 'website', qrId: null })
    assert.deepEqual(classify('ref=app'), { source: 'nessa_app', qrId: null })
    // ref beats the referrer
    assert.equal(classify('ref=qr', 'https://www.google.com/').source, 'qr')
  })

  it('honors utm_source / utm_medium', () => {
    assert.equal(classify('utm_source=instagram&utm_medium=bio').source, 'instagram')
    assert.equal(classify('utm_source=flyer&utm_medium=qr').source, 'qr')
  })

  it('infers from the referrer', () => {
    assert.equal(classify('', 'https://www.google.com.br/').source, 'search')
    assert.equal(classify('', 'https://www.bing.com/search?q=x').source, 'search')
    assert.equal(classify('', 'https://l.instagram.com/?u=x').source, 'instagram')
    assert.equal(classify('', 'https://www.nessachat.com/chat/x').source, 'nessa_web')
    assert.equal(classify('', 'https://kitecabana.com/').source, 'referral')
    assert.equal(classify('', '').source, 'direct')
    assert.equal(classify('ref=unknown', '').source, 'direct')
  })

  it('only keeps a QR id for QR traffic', () => {
    assert.equal(classify('ref=ig&qr=table-4').qrId, null)
    assert.equal(sanitizeQrId('front door'), null)
  })
})

describe('stripPlaceTrackingParams', () => {
  it('removes attribution params and keeps the rest', () => {
    assert.equal(
      stripPlaceTrackingParams('https://www.nessachat.com/places/x?ref=qr&qr=t1&utm_source=a&keep=1#top'),
      '/places/x?keep=1#top',
    )
    assert.equal(
      stripPlaceTrackingParams('https://www.nessachat.com/places/x?ref=ig'),
      '/places/x',
    )
  })

  it('returns null when there is nothing to strip', () => {
    assert.equal(stripPlaceTrackingParams('https://www.nessachat.com/places/x?keep=1'), null)
    assert.equal(stripPlaceTrackingParams('not a url'), null)
  })
})
