import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatDayRange,
  formatInterval,
  groupOpeningHours,
  safeSocialUrl,
  safeWebUrl,
  sanitizeOpeningHours,
  sanitizePublicBusiness,
  weekDayFromJsDay,
} from './business-profile'

const base = { businessId: 'biz_1', verified: true, name: 'KiteCabana' }

describe('sanitizePublicBusiness', () => {
  it('requires a verified business with a name and id', () => {
    assert.equal(sanitizePublicBusiness(null), undefined)
    assert.equal(sanitizePublicBusiness({ ...base, verified: false }), undefined)
    assert.equal(sanitizePublicBusiness({ ...base, verified: 'true' }), undefined)
    assert.equal(sanitizePublicBusiness({ ...base, name: '   ' }), undefined)
    assert.equal(sanitizePublicBusiness({ ...base, businessId: 42 }), undefined)
    assert.deepEqual(sanitizePublicBusiness(base), base)
  })

  it('passes valid new fields through', () => {
    const out = sanitizePublicBusiness({
      ...base,
      category: 'restaurant',
      address: 'Rua das Dunas, 120',
      email: 'Hello@KiteCabana.com ',
      bookingUrl: 'https://book.kitecabana.com/r?x=1',
      menuUrl: 'https://kitecabana.com/menu.pdf',
      socials: {
        instagram: 'https://www.instagram.com/kitecabana',
        facebook: 'https://facebook.com/kitecabana',
        tiktok: 'https://www.tiktok.com/@kitecabana',
        youtube: 'https://youtube.com/@kitecabana',
        x: 'https://x.com/kitecabana',
      },
      priceRange: '$$',
      paymentMethods: ['Cash', 'Card', 'Pix', 'Cash'],
      openingHours: { mon: [{ opens: '08:00', closes: '22:00' }] },
    })
    assert.ok(out)
    assert.equal(out.category, 'restaurant')
    assert.equal(out.address, 'Rua das Dunas, 120')
    assert.equal(out.email, 'hello@kitecabana.com')
    assert.equal(out.bookingUrl, 'https://book.kitecabana.com/r?x=1')
    assert.equal(out.menuUrl, 'https://kitecabana.com/menu.pdf')
    assert.equal(Object.keys(out.socials ?? {}).length, 5)
    assert.equal(out.priceRange, '$$')
    assert.deepEqual(out.paymentMethods, ['Cash', 'Card', 'Pix'])
    assert.deepEqual(out.openingHours, { mon: [{ opens: '08:00', closes: '22:00' }] })
  })

  it('drops malicious or malformed values', () => {
    const out = sanitizePublicBusiness({
      ...base,
      category: 'casino',
      website: 'javascript:alert(1)',
      bookingUrl: 'http://book.example.com',
      menuUrl: 'data:text/html,<script>alert(1)</script>',
      logoUrl: 'https://maps.googleapis.com/photo?key=SECRET',
      coverUrl: '//evil.example.com/x.png',
      email: 'not-an-email" onmouseover="x',
      phone: '12',
      socials: {
        instagram: 'https://evil.com/instagram.com',
        facebook: 'https://facebook.com.evil.com/page',
        tiktok: 'javascript://tiktok.com/%0Aalert(1)',
        youtube: 'https://user:pass@youtube.com/x',
        x: '@handle',
      },
      priceRange: '$$$$$',
      paymentMethods: 'Cash',
      languages: ['EN', 'pt-BR', '<script>', 'english language'],
      amenities: [1, 'Pool', { a: 1 }],
      openingHours: { mon: [{ opens: '25:00', closes: '26:00' }], funday: [{ opens: '08:00', closes: '09:00' }] },
      address: 'Line 1\nLine 2 x',
      hours: 'Mon–Fri\r\n8–22',
    })
    assert.ok(out)
    for (const key of [
      'category',
      'website',
      'bookingUrl',
      'menuUrl',
      'logoUrl',
      'coverUrl',
      'email',
      'phone',
      'socials',
      'priceRange',
      'paymentMethods',
      'openingHours',
    ] as const) {
      assert.equal(out[key], undefined, key)
    }
    assert.deepEqual(out.languages, ['en', 'pt-br'])
    assert.deepEqual(out.amenities, ['Pool'])
    assert.equal(out.address, 'Line 1 Line 2 x')
    assert.equal(out.hours, 'Mon–Fri\n8–22')
  })

  it('keeps http websites saved before https-only, but not other http links', () => {
    const out = sanitizePublicBusiness({ ...base, website: 'http://kitecabana.com', bookingUrl: 'http://kitecabana.com/book' })
    assert.equal(out?.website, 'http://kitecabana.com/')
    assert.equal(out?.bookingUrl, undefined)
  })

  it('caps list sizes and text lengths', () => {
    const out = sanitizePublicBusiness({
      ...base,
      paymentMethods: Array.from({ length: 15 }, (_, i) => `Method ${i}`),
      description: 'x'.repeat(900),
    })
    assert.equal(out?.paymentMethods?.length, 10)
    assert.ok((out?.description?.length ?? 0) <= 600)
  })
})

describe('URL helpers', () => {
  it('safeWebUrl only allows https (and http when asked)', () => {
    assert.equal(safeWebUrl('https://a.com/x'), 'https://a.com/x')
    assert.equal(safeWebUrl('http://a.com'), undefined)
    assert.equal(safeWebUrl('http://a.com', { allowHttp: true }), 'http://a.com/')
    assert.equal(safeWebUrl('JAVASCRIPT:alert(1)', { allowHttp: true }), undefined)
    assert.equal(safeWebUrl('https://localhost/x'), undefined)
    assert.equal(safeWebUrl('https://a.com/"><img>'), undefined)
    assert.equal(safeWebUrl(42), undefined)
  })

  it('safeSocialUrl checks the network domain', () => {
    assert.equal(safeSocialUrl('instagram', 'https://instagram.com/a'), 'https://instagram.com/a')
    assert.equal(safeSocialUrl('instagram', 'https://facebook.com/a'), undefined)
    assert.equal(safeSocialUrl('x', 'https://twitter.com/a'), 'https://twitter.com/a')
    assert.equal(safeSocialUrl('youtube', 'https://youtu.be/abc'), 'https://youtu.be/abc')
    assert.equal(safeSocialUrl('facebook', 'https://notfacebook.com/a'), undefined)
  })
})

describe('opening hours', () => {
  it('sanitizes days and intervals', () => {
    assert.equal(sanitizeOpeningHours(undefined), undefined)
    assert.equal(sanitizeOpeningHours([]), undefined)
    // Nothing valid: unknown, never "closed all week".
    assert.equal(sanitizeOpeningHours({}), undefined)
    assert.equal(sanitizeOpeningHours({ mon: [{ opens: '24:00', closes: '10:00' }] }), undefined)
    assert.deepEqual(
      sanitizeOpeningHours({
        tue: [
          { opens: '18:00', closes: '23:00' },
          { opens: '08:00', closes: '12:00' },
          { opens: '08:00', closes: '12:00' },
          { opens: '13:00', closes: '15:00' },
          { opens: '16:00', closes: '17:00' },
        ],
        wed: [{ opens: '22:00', closes: '02:00' }],
        sun: [{ opens: '00:00', closes: '24:00' }],
      }),
      {
        tue: [
          { opens: '08:00', closes: '12:00' },
          { opens: '13:00', closes: '15:00' },
          { opens: '16:00', closes: '17:00' },
        ],
        wed: [{ opens: '22:00', closes: '02:00' }],
        sun: [{ opens: '00:00', closes: '24:00' }],
      },
    )
  })

  it('collapses consecutive identical days', () => {
    const day = [{ opens: '08:00', closes: '22:00' }]
    const groups = groupOpeningHours({
      mon: day,
      tue: day,
      wed: day,
      thu: day,
      fri: day,
      sat: [{ opens: '00:00', closes: '24:00' }],
      sun: [{ opens: '00:00', closes: '00:00' }],
    })
    assert.deepEqual(
      groups.map(g => [formatDayRange(g.days), g.intervals.map(formatInterval).join(', ') || 'Closed']),
      [
        ['Mon–Fri', '08:00–22:00'],
        ['Sat–Sun', 'Open 24 hours'],
      ],
    )
  })

  it('shows closed days and does not merge across a gap', () => {
    const day = [{ opens: '09:00', closes: '17:00' }]
    const groups = groupOpeningHours({ mon: day, wed: day, thu: day })
    assert.deepEqual(
      groups.map(g => [formatDayRange(g.days), g.intervals.length ? 'open' : 'closed']),
      [
        ['Mon', 'open'],
        ['Tue', 'closed'],
        ['Wed–Thu', 'open'],
        ['Fri–Sun', 'closed'],
      ],
    )
  })

  it('maps JS weekdays', () => {
    assert.equal(weekDayFromJsDay(0), 'sun')
    assert.equal(weekDayFromJsDay(1), 'mon')
    assert.equal(weekDayFromJsDay(6), 'sat')
  })
})
