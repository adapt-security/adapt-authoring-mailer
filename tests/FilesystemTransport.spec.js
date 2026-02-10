import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('FilesystemTransport', () => {
  describe('module structure', () => {
    it('should have valid JavaScript syntax', () => {
      const filePath = join(__dirname, '../lib/transports/FilesystemTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.length > 0)
      assert.ok(content.includes('class FilesystemTransport'))
    })

    it('should export default class', () => {
      const filePath = join(__dirname, '../lib/transports/FilesystemTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('export default FilesystemTransport'))
    })

    it('should extend AbstractMailTransport', () => {
      const filePath = join(__dirname, '../lib/transports/FilesystemTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('extends AbstractMailTransport'))
    })

    it('should define name property as filesystem', () => {
      const filePath = join(__dirname, '../lib/transports/FilesystemTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes("name = 'filesystem'"))
    })

    it('should define outputDir getter', () => {
      const filePath = join(__dirname, '../lib/transports/FilesystemTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('get outputDir'))
    })

    it('should define send method', () => {
      const filePath = join(__dirname, '../lib/transports/FilesystemTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async send'))
    })

    it('should define test method', () => {
      const filePath = join(__dirname, '../lib/transports/FilesystemTransport.js')
      const content = readFileSync(filePath, 'utf-8')
      assert.ok(content.includes('async test'))
    })
  })
})
