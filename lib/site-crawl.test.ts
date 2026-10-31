import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { SITEMAP_STATIC_PATHS, isDisallowedByRobots } from './site-crawl'

describe('robots.txt vs sitemap', () => {
  it('never lists a disallowed page in the sitemap', () => {
    for (const path of SITEMAP_STATIC_PATHS) {
      assert.equal(isDisallowedByRobots(path), false, path)
    }
  })

  it('keeps chat rooms and dashboards out', () => {
    assert.equal(isDisallowedByRobots('/chat/abc'), true)
    assert.equal(isDisallowedByRobots('/business/x/details'), true)
    assert.equal(isDisallowedByRobots('/places/kitecabana-cumbuco'), false)
  })
})
