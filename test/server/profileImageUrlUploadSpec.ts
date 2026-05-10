/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import sinon from 'sinon'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { profileImageUrlUpload } from '../../routes/profileImageUrlUpload'

const expect = chai.expect
chai.use(sinonChai)

describe('profileImageUrlUpload', () => {
  let req: any
  let res: any
  let next: any
  let appLocals: Record<string, unknown>

  beforeEach(() => {
    appLocals = {}
    req = {
      body: {},
      cookies: {},
      app: { locals: appLocals },
      socket: { remoteAddress: '127.0.0.1' }
    }
    res = { redirect: sinon.spy(), location: sinon.spy() }
    next = sinon.spy()
    process.env.BASE_PATH = ''
  })

  it('marks abused_ssrf_bug when imageUrl points at /solve/challenges/server-side', async () => {
    req.body.imageUrl = 'http://localhost:3000/solve/challenges/server-side?key=foo'

    await profileImageUrlUpload()(req, res, next)

    expect(appLocals.abused_ssrf_bug).to.equal(true)
  })

  it('does not mark abused_ssrf_bug for unrelated imageUrls', async () => {
    req.body.imageUrl = 'http://example.com/image.png'

    await profileImageUrlUpload()(req, res, next)

    expect(appLocals.abused_ssrf_bug).to.not.equal(true)
  })

  // Regression for CodeQL js/polynomial-redos (alert #84).
  it('handles long imageUrl values quickly (no polynomial ReDoS)', async () => {
    req.body.imageUrl = 'a'.repeat(20000)

    const start = Date.now()
    await profileImageUrlUpload()(req, res, next)
    const elapsed = Date.now() - start

    expect(elapsed).to.be.lessThan(200)
    expect(appLocals.abused_ssrf_bug).to.not.equal(true)
  })
})
