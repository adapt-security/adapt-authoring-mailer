import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('AbstractMailTransport', () => {
  describe('module structure', () => {
    it('should have valid JavaScript syntax', () => {
      const filePath = join(__dirname, '../lib/AbstractMailTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.length > 0)
      assert.ok(content.includes('class AbstractMailTransport'))
    })

    it('should export default class', () => {
      const filePath = join(__dirname, '../lib/AbstractMailTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('export default AbstractMailTransport'))
    })

    it('should define send method', () => {
      const filePath = join(__dirname, '../lib/AbstractMailTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async send'))
    })

    it('should define test method', () => {
      const filePath = join(__dirname, '../lib/AbstractMailTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async test'))
    })

    it('should define getConfig method', () => {
      const filePath = join(__dirname, '../lib/AbstractMailTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('getConfig'))
    })
  })
})
