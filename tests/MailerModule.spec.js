import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('MailerModule', () => {
  describe('module structure', () => {
    it('should have valid JavaScript syntax', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.length > 0)
      assert.ok(content.includes('class MailerModule'))
    })

    it('should export default class', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('export default MailerModule'))
    })

    it('should extend AbstractModule', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('extends AbstractModule'))
    })

    it('should define init method', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async init'))
    })

    it('should define registerTransport method', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('registerTransport'))
    })

    it('should define getTransport method', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('getTransport'))
    })

    it('should define initTransports method', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async initTransports'))
    })

    it('should define send method', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async send'))
    })

    it('should define testEmailHandler method', () => {
      const filePath = join(__dirname, '../lib/MailerModule.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async testEmailHandler'))
    })
  })
})
