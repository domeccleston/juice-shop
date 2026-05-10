/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import sinon from 'sinon'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { serveKeyFiles, serveKeyFilesRateLimiter } from '../../routes/keyServer'
const expect = chai.expect
chai.use(sinonChai)

describe('keyServer', () => {
  let req: any
  let res: any
  let next: any

  beforeEach(() => {
    req = { params: { } }
    res = { sendFile: sinon.spy(), status: sinon.spy() }
    next = sinon.spy()
  })

  it('should serve requested file from folder /encryptionkeys', () => {
    req.params.file = 'test.file'

    serveKeyFiles()(req, res, next)

    expect(res.sendFile).to.have.been.calledWith(sinon.match(/encryptionkeys[/\\]test.file/))
  })

  it('should raise error for slashes in filename', () => {
    req.params.file = '../../../../nice.try'

    serveKeyFiles()(req, res, next)

    expect(res.sendFile).to.have.not.been.calledWith(sinon.match.any)
    expect(next).to.have.been.calledWith(sinon.match.instanceOf(Error))
  })
})

describe('serveKeyFilesRateLimiter', () => {
  let server: http.Server
  let port: number

  before((done) => {
    const app = express()
    app.enable('trust proxy')
    app.use('/encryptionkeys/:file', serveKeyFilesRateLimiter, (_req, res) => { res.status(200).send('ok') })
    server = app.listen(0, () => {
      port = (server.address() as AddressInfo).port
      done()
    })
  })

  after((done) => { server.close(() => { done() }) })

  it('responds with HTTP 429 once a single client exceeds 100 requests in the window', async function () {
    this.timeout(20000)
    const ip = '203.0.113.51'
    const fire = async () => await new Promise<number>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path: '/encryptionkeys/test.key', headers: { 'X-Forwarded-For': ip } }, (response) => {
        response.resume()
        resolve(response.statusCode ?? 0)
      }).on('error', reject)
    })

    const statuses = await Promise.all(Array.from({ length: 101 }, fire))
    expect(statuses.filter((s) => s === 200)).to.have.lengthOf(100)
    expect(statuses.filter((s) => s === 429)).to.have.lengthOf(1)
  })
})
