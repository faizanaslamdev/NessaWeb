import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  compactCount,
  filterByCategory,
  filterByTown,
  foldText,
  parseDirectoryPlace,
  placeCategory,
  placeHref,
  placeTypeLabel,
  searchPlaces,
  stripKeyedPhoto,
  topTowns,
  type DirectoryPlace,
} from './place-directory'

const p = (name: string, city: string, placeType = 'Hotel', extra: Partial<DirectoryPlace> = {}): DirectoryPlace => ({
  placeId: `ChIJ${foldText(name).replace(/ /g, '')}`,
  name,
  city,
  placeType,
  recommenderCount: 0,
  storyCount: 0,
  visitedCount: 0,
  verified: false,
  ...extra,
})

const LIST = [p('Café do Vento', 'Cumbuco', 'Café'), p('Casa Kite', 'Cumbuco'), p('Hostel Duna', 'Jericoacoara', 'Hostel'), p('Praia do Futuro', 'Fortaleza', 'Beach')]

describe('place directory helpers', () => {
  it('folds accents and punctuation', () => {
    assert.equal(foldText('  Café — do  Vento! '), 'cafe do vento')
  })
  it('searches name words first, then town; every word must match', () => {
    assert.deepEqual(searchPlaces(LIST, 'cafe').map(x => x.name), ['Café do Vento'])
    assert.deepEqual(searchPlaces(LIST, 'cumbuco').map(x => x.name), ['Café do Vento', 'Casa Kite'])
    assert.deepEqual(searchPlaces(LIST, 'kite cumb').map(x => x.name), ['Casa Kite'])
    assert.deepEqual(searchPlaces(LIST, 'duna fortaleza'), [])
    assert.equal(searchPlaces(LIST, '  ').length, 4)
    assert.deepEqual(searchPlaces(LIST, 'v').map(x => x.name), ['Café do Vento'])
  })
  it('categories, towns and labels', () => {
    assert.equal(placeCategory('Hostel'), 'stay')
    assert.equal(placeCategory('lodging'), 'stay')
    assert.equal(placeCategory('Restaurant'), 'eat')
    assert.equal(placeCategory('Beach'), 'beach')
    assert.equal(placeCategory('Tour'), 'do')
    assert.equal(placeCategory('locality'), null)
    assert.deepEqual(filterByCategory(LIST, 'eat').map(x => x.name), ['Café do Vento'])
    assert.equal(filterByCategory(LIST, 'all').length, 4)
    assert.equal(filterByTown(LIST, 'CUMBUCO').length, 2)
    assert.deepEqual(topTowns(LIST, 2), [{ town: 'Cumbuco', count: 2 }, { town: 'Fortaleza', count: 1 }])
    assert.equal(placeTypeLabel('lodging'), 'Stay')
    assert.equal(placeTypeLabel('locality'), 'Town')
    assert.equal(placeTypeLabel('kite_school'), 'Kite school')
    assert.equal(placeTypeLabel(''), 'Place')
  })
  it('links, counts and photo safety', () => {
    assert.equal(placeHref({ placeId: 'ChIJx', slug: 'casa-kite' }), '/places/casa-kite')
    assert.equal(placeHref({ placeId: 'ChIJx' }), '/place/ChIJx')
    assert.equal(compactCount(999), '999')
    assert.equal(compactCount(1200), '1.2k')
    assert.equal(compactCount(15400), '15k')
    assert.equal(stripKeyedPhoto(p('a', 'b', 'Hotel', { photoUrl: 'https://places.googleapis.com/v1/x/media?key=K' })).photoUrl, undefined)
    assert.equal(stripKeyedPhoto(p('a', 'b', 'Hotel', { photoUrl: 'https://lh3.googleusercontent.com/x' })).photoUrl, undefined)
    const own = 'https://firebasestorage.googleapis.com/v0/b/nessa-86e2f.appspot.com/o/places%2Fx%2Ffeed.jpg?alt=media&token=t'
    assert.equal(stripKeyedPhoto(p('a', 'b', 'Hotel', { photoUrl: own })).photoUrl, own)
  })
  it('parses callable rows defensively', () => {
    assert.equal(parseDirectoryPlace({ placeId: 'bad', name: 'x' }), null)
    assert.equal(parseDirectoryPlace({ placeId: 'ChIJok', name: '  ' }), null)
    const ok = parseDirectoryPlace({ placeId: 'ChIJok', name: 'Ok', slug: 'Not A Slug', verified: true, recommenderCount: -3, photoUrl: 'http://insecure' })!
    assert.equal(ok.slug, undefined)
    assert.equal(ok.verified, true)
    assert.equal(ok.recommenderCount, 0)
    assert.equal(ok.photoUrl, undefined)
    assert.equal(ok.placeType, 'Place')
  })
})
