import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { adminConsoleHref, adminConsoleOrigin } from './constants'

describe('adminConsoleHref', () => {
  it('links the production public site to admin.nessachat.com', () => {
    assert.equal(adminConsoleOrigin('www.nessachat.com'), 'https://admin.nessachat.com')
    assert.equal(adminConsoleHref('', 'www.nessachat.com'), 'https://admin.nessachat.com/')
    assert.equal(adminConsoleHref('places', 'nessachat.com'), 'https://admin.nessachat.com/places')
  })
  it('keeps /admin on local and preview hosts', () => {
    assert.equal(adminConsoleHref('', 'localhost'), '/admin')
    assert.equal(adminConsoleHref('/audit', 'nessa-web-git-x.vercel.app'), '/admin/audit')
  })
})
