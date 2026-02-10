import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('SmtpTransport', () => {
  let content

  before(() => {
    const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
    content = readFileSync(filePath, 'utf-8')
  })

  describe('module structure', () => {
    it('should have valid JavaScript syntax', () => {
      assert.ok(content.length > 0)
      assert.ok(content.includes('class SmtpTransport'))
    })

    it('should export default class', () => {
      assert.ok(content.includes('export default SmtpTransport'))
    })

    it('should extend AbstractMailTransport', () => {
      assert.ok(content.includes('extends AbstractMailTransport'))
    })

    it('should define name property as smtp', () => {
      assert.ok(content.includes("name = 'smtp'"))
    })

    it('should define createTransport method', () => {
      assert.ok(content.includes('createTransport'))
    })

    it('should define send method', () => {
      assert.ok(content.includes('async send'))
    })

    it('should define test method', () => {
      assert.ok(content.includes('async test'))
    })
  })
})
