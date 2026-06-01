/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import sinon from 'sinon'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import fs from 'node:fs'
import { promotionVideo } from '../../routes/videoHandler'

const expect = chai.expect
chai.use(sinonChai)

describe('videoHandler', () => {
  describe('promotionVideo', () => {
    let req: any
    let res: any
    let readFileStub: sinon.SinonStub

    beforeEach(() => {
      req = {}
      res = {
        send: sinon.spy(),
        status: sinon.stub().returnsThis()
      }
    })

    afterEach(() => {
      if (readFileStub) readFileStub.restore()
    })

    it('should respond with 500 instead of throwing when reading the template file fails', (done) => {
      readFileStub = sinon.stub(fs, 'readFile').callsFake((_path: any, cb: any) => {
        cb(new Error('boom'), undefined)
      })

      expect(() => { promotionVideo()(req, res) }).to.not.throw()

      setImmediate(() => {
        expect(res.status).to.have.been.calledWith(500)
        expect(res.send.called).to.equal(true)
        done()
      })
    })
  })
})
