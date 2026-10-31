import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildBusinessProfilePayload,
  copyDayToAll,
  draftFromProfile,
  hoursFromWeekDraft,
  setAllDays,
  socialInputError,
  weekDraftFromHours,
} from './business-form'

describe('business details form', () => {
  it('round-trips opening hours through the editor draft', () => {
    const hours = {
      mon: [
        { opens: '08:00', closes: '12:00' },
        { opens: '14:00', closes: '02:00' },
      ],
      sat: [{ opens: '00:00', closes: '24:00' }],
    }
    const draft = weekDraftFromHours(hours)
    assert.equal(draft.mon.mode, 'open')
    assert.equal(draft.tue.mode, 'closed')
    assert.equal(draft.sat.mode, 'all-day')
    assert.deepEqual(hoursFromWeekDraft(draft), { hours })
    assert.deepEqual(hoursFromWeekDraft(weekDraftFromHours(undefined)), {})
  })

  it('copies a day to the whole week and sets 24/7', () => {
    const draft = weekDraftFromHours({ wed: [{ opens: '10:00', closes: '20:00' }] })
    const all = hoursFromWeekDraft(copyDayToAll(draft, 'wed')).hours
    assert.equal(Object.keys(all ?? {}).length, 7)
    assert.deepEqual(all?.sun, [{ opens: '10:00', closes: '20:00' }])
    const always = hoursFromWeekDraft(setAllDays(draft, 'all-day')).hours
    assert.deepEqual(always?.mon, [{ opens: '00:00', closes: '24:00' }])
  })

  it('rejects incomplete or zero-length ranges', () => {
    const draft = weekDraftFromHours(undefined)
    draft.tue = { mode: 'open', intervals: [{ opens: '09:00', closes: '' }] }
    assert.match(hoursFromWeekDraft(draft).error ?? '', /Tuesday/)
    draft.tue = { mode: 'open', intervals: [{ opens: '09:00', closes: '09:00' }] }
    assert.match(hoursFromWeekDraft(draft).error ?? '', /24 hours/)
  })

  it('accepts @handles only where the backend normalizes them', () => {
    assert.equal(socialInputError('instagram', '@kitecabana'), null)
    assert.equal(socialInputError('x', '@kite_cabana'), null)
    assert.match(socialInputError('facebook', '@kitecabana') ?? '', /full link/)
    assert.equal(socialInputError('youtube', 'https://youtube.com/@kitecabana'), null)
    assert.match(socialInputError('tiktok', 'my handle') ?? '', /link or @handle/)
  })

  it('sends every editable field (the callable replaces the set)', () => {
    const draft = draftFromProfile({
      name: 'KiteCabana',
      category: 'hotel',
      website: 'https://kitecabana.com',
      openingHours: { mon: [{ opens: '08:00', closes: '22:00' }] },
      socials: { instagram: 'https://instagram.com/kitecabana' },
      priceRange: '$$',
      paymentMethods: ['Cash'],
    })
    draft.email = ' Hello@KiteCabana.com '
    draft.paymentMethods = 'Cash, Pix, Cash'
    draft.socials.x = '@kitecabana'
    const { profile, error } = buildBusinessProfilePayload(draft)
    assert.equal(error, undefined)
    assert.deepEqual(profile, {
      name: 'KiteCabana',
      category: 'hotel',
      description: '',
      website: 'https://kitecabana.com',
      phone: '',
      whatsapp: '',
      email: 'hello@kitecabana.com',
      address: '',
      bookingUrl: '',
      menuUrl: '',
      hours: '',
      checkIn: '',
      checkOut: '',
      amenities: [],
      languages: [],
      paymentMethods: ['Cash', 'Pix'],
      openingHours: { mon: [{ opens: '08:00', closes: '22:00' }] },
      socials: { instagram: 'https://instagram.com/kitecabana', x: '@kitecabana' },
      priceRange: '$$',
    })
  })

  it('omits empty object / enum fields so the backend clears them', () => {
    const { profile } = buildBusinessProfilePayload(draftFromProfile({ name: 'KiteCabana' }))
    assert.ok(profile)
    assert.equal('openingHours' in profile, false)
    assert.equal('socials' in profile, false)
    assert.equal('priceRange' in profile, false)
  })

  it('validates email and payment methods lightly', () => {
    const draft = draftFromProfile({ name: 'KiteCabana' })
    draft.email = 'nope'
    assert.match(buildBusinessProfilePayload(draft).error ?? '', /Email/)
    draft.email = ''
    draft.paymentMethods = Array.from({ length: 11 }, (_, i) => `M${i}`).join(', ')
    assert.match(buildBusinessProfilePayload(draft).error ?? '', /up to 10/)
    draft.paymentMethods = 'x'.repeat(31)
    assert.match(buildBusinessProfilePayload(draft).error ?? '', /too long/)
  })
})
