/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import chai from 'chai'
import express from 'express'
import http from 'node:http'
import { type AddressInfo } from 'node:net'
import { rateLimit } from 'express-rate-limit'
import { challenges } from '../../data/datacache'
import { type Challenge } from 'data/types'
import { checkUploadSize, checkFileType } from '../../routes/fileUpload'

const expect = chai.expect

describe('fileUpload', () => {
  let req: any
  let res: any
  let save: any

  beforeEach(() => {
    req = { file: { originalname: '' } }
    res = {}
    save = () => ({
      then () { }
    })
  })

  describe('should not solve "uploadSizeChallenge" when file size is', () => {
    const sizes = [0, 1, 100, 1000, 10000, 99999, 100000]
    sizes.forEach(size => {
      it(`${size} bytes`, () => {
        challenges.uploadSizeChallenge = { solved: false, save } as unknown as Challenge
        req.file.size = size

        checkUploadSize(req, res, () => {})

        expect(challenges.uploadSizeChallenge.solved).to.equal(false)
      })
    })
  })

  it('should solve "uploadSizeChallenge" when file size exceeds 100000 bytes', () => {
    challenges.uploadSizeChallenge = { solved: false, save } as unknown as Challenge
    req.file.size = 100001

    checkUploadSize(req, res, () => {})

    expect(challenges.uploadSizeChallenge.solved).to.equal(true)
  })

  it('should solve "uploadTypeChallenge" when file type is not PDF', () => {
    challenges.uploadTypeChallenge = { solved: false, save } as unknown as Challenge
    req.file.originalname = 'hack.exe'

    checkFileType(req, res, () => {})

    expect(challenges.uploadTypeChallenge.solved).to.equal(true)
  })

  it('should not solve "uploadTypeChallenge" when file type is PDF', () => {
    challenges.uploadTypeChallenge = { solved: false, save } as unknown as Challenge
    req.file.originalname = 'hack.pdf'

    checkFileType(req, res, () => {})

    expect(challenges.uploadTypeChallenge.solved).to.equal(false)
  })

  describe('rate limiting', () => {
    let server: http.Server
    let port: number

    before(async () => {
      const app = express()
      app.post('/file-upload', rateLimit({ windowMs: 5 * 60 * 1000, max: 2, validate: false }), (_req, res) => { res.status(204).end() })
      await new Promise<void>(resolve => {
        server = app.listen(0, () => { resolve() })
      })
      port = (server.address() as AddressInfo).port
    })

    after(async () => {
      await new Promise<void>(resolve => server.close(() => { resolve() }))
    })

    const postStatus = async (path: string) => await new Promise<number>((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path, method: 'POST' }, response => {
        response.resume()
        resolve(response.statusCode ?? 0)
      })
      req.on('error', reject)
      req.end()
    })

    it('rejects requests beyond the configured maximum on the /file-upload route', async () => {
      expect(await postStatus('/file-upload')).to.equal(204)
      expect(await postStatus('/file-upload')).to.equal(204)
      expect(await postStatus('/file-upload')).to.equal(429)
    })
  })
})
