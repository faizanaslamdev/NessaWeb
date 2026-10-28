import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { describeAccountAuthError } from './auth-errors'
import { buildInitialUserDoc } from './user-doc'
import {
  defaultSignedInPath,
  cleanDisplayName,
  normalizeEmail,
  safeNextPath,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from './validation'

describe('account validation', () => {
  it('normalizes and validates emails', () => {
    assert.equal(normalizeEmail('  Owner@Hotel.COM '), 'owner@hotel.com')
    assert.equal(validateEmail('owner@hotel.com'), null)
    assert.ok(validateEmail(''))
    assert.ok(validateEmail('not-an-email'))
  })

  it('validates passwords and names', () => {
    assert.ok(validatePassword(''))
    assert.ok(validatePassword('short'))
    assert.equal(validatePassword('longenough1'), null)
    assert.ok(validateDisplayName('   '))
    assert.equal(validateDisplayName('Ana'), null)
    assert.equal(cleanDisplayName('  Ana   Souza '), 'Ana Souza')
  })

  it('only allows same-origin relative next paths', () => {
    assert.equal(safeNextPath(null), '/business')
    assert.equal(safeNextPath('/business/abc?tab=qr'), '/business/abc?tab=qr')
    assert.equal(safeNextPath('https://evil.example/'), '/business')
    assert.equal(safeNextPath('//evil.example/'), '/business')
    assert.equal(safeNextPath('javascript:alert(1)'), '/business')
    assert.equal(safeNextPath('/\\evil.example'), '/business')
  })
})

describe('describeAccountAuthError', () => {
  it('maps common Firebase codes without leaking account existence', () => {
    assert.equal(
      describeAccountAuthError({ code: 'auth/user-not-found' }),
      describeAccountAuthError({ code: 'auth/wrong-password' }),
    )
    assert.ok(describeAccountAuthError({ code: 'auth/email-already-in-use' }).includes('already exists'))
    assert.ok(describeAccountAuthError(new Error('boom')).length > 0)
  })
})

describe('buildInitialUserDoc', () => {
  it('matches the app profile shape', () => {
    const doc = buildInitialUserDoc({ email: 'a@b.co', name: 'Ana', serverTimestamp: 'TS' })
    assert.equal(doc.schemaVersion, 2)
    assert.equal(doc.isProfileComplete, false)
    assert.equal(doc.requiresEmailVerification, true)
    assert.deepEqual(doc.socialCounts, { followers: 0, following: 0, stories: 0 })
    assert.deepEqual(doc.blockedUsers, [])
    assert.equal(doc.createdAt, 'TS')
    assert.equal((doc.settings as { translationLanguage: string }).translationLanguage, 'en')
  })
})

describe('defaultSignedInPath', () => {
  it('sends admin-host sign-ins to the console root', () => {
    assert.equal(defaultSignedInPath('admin.nessachat.com'), '/')
    assert.equal(defaultSignedInPath('ADMIN.nessachat.com'), '/')
    assert.equal(defaultSignedInPath('www.nessachat.com'), '/business')
    assert.equal(defaultSignedInPath(null), '/business')
  })
})
