import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('SmtpTransport', () => {
  describe('module structure', () => {
    it('should have valid JavaScript syntax', () => {
      const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.length > 0)
      assert.ok(content.includes('class SmtpTransport'))
    })

    it('should export default class', () => {
      const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('export default SmtpTransport'))
    })

    it('should extend AbstractMailTransport', () => {
      const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('extends AbstractMailTransport'))
    })

    it('should define name property as smtp', () => {
      const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes("name = 'smtp'"))
    })

    it('should define createTransport method', () => {
      const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('createTransport'))
    })

    it('should define send method', () => {
      const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async send'))
    })

    it('should define test method', () => {
      const filePath = join(__dirname, '../lib/transports/SmtpTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async test'))
    })
  })
})
