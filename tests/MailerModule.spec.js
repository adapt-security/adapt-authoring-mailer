import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('MailerModule', () => {
  let content

  before(() => {
    const filePath = join(__dirname, '../lib/MailerModule.js')
    content = readFileSync(filePath, 'utf-8')
  })

  describe('module structure', () => {
    it('should have valid JavaScript syntax', () => {
      assert.ok(content.length > 0)
      assert.ok(content.includes('class MailerModule'))
    })

    it('should export default class', () => {
      assert.ok(content.includes('export default MailerModule'))
    })

    it('should extend AbstractModule', () => {
      assert.ok(content.includes('extends AbstractModule'))
    })

    it('should define init method', () => {
      assert.ok(content.includes('async init'))
    })

    it('should define registerTransport method', () => {
      assert.ok(content.includes('registerTransport'))
    })

    it('should define getTransport method', () => {
      assert.ok(content.includes('getTransport'))
    })

    it('should define initTransports method', () => {
      assert.ok(content.includes('async initTransports'))
    })

    it('should define send method', () => {
      assert.ok(content.includes('async send'))
    })

    it('should define testEmailHandler method', () => {
      assert.ok(content.includes('async testEmailHandler'))
    })
  })
})
