import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('AbstractMailTransport', () => {
  let content

  before(() => {
    const filePath = join(__dirname, '../lib/AbstractMailTransport.js')
    content = readFileSync(filePath, 'utf-8')
  })

  describe('module structure', () => {
    it('should contain AbstractMailTransport class definition', () => {
      assert.ok(content.length > 0)
      assert.ok(content.includes('class AbstractMailTransport'))
    })

    it('should export default class', () => {
      assert.ok(content.includes('export default AbstractMailTransport'))
    })

    it('should define send method', () => {
      assert.ok(content.includes('async send'))
    })

    it('should define test method', () => {
      assert.ok(content.includes('async test'))
    })

    it('should define getConfig method', () => {
      assert.ok(content.includes('getConfig'))
    })
  })
})
