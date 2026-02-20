import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

const mockApp = {
  instance: {
    config: { get: mock.fn((key) => `mock-${key}`) },
    getConfig: mock.fn((key) => `/tmp/test-${key}`)
  }
}

mock.module('adapt-authoring-core', {
  namedExports: { App: mockApp }
})

const fsMock = {
  writeFile: mock.fn(async () => {}),
  mkdir: mock.fn(async () => {}),
  readdir: mock.fn(async () => [])
}

mock.module('fs/promises', { namedExports: fsMock, defaultExport: fsMock })

const { default: FilesystemTransport } = await import('../lib/transports/FilesystemTransport.js')
const { default: AbstractMailTransport } = await import('../lib/AbstractMailTransport.js')

describe('FilesystemTransport', () => {
  describe('class', () => {
    it('should extend AbstractMailTransport', () => {
      const transport = new FilesystemTransport()
      assert.ok(transport instanceof AbstractMailTransport)
    })

    it('should have name set to filesystem', () => {
      const transport = new FilesystemTransport()
      assert.equal(transport.name, 'filesystem')
    })
  })

  describe('outputDir', () => {
    it('should return a path under the app tempDir', () => {
      const transport = new FilesystemTransport()
      const dir = transport.outputDir
      assert.ok(dir.includes('mailer'))
      assert.ok(dir.includes('tempDir'))
    })

    it('should end with the mailer subdirectory', () => {
      const transport = new FilesystemTransport()
      const dir = transport.outputDir
      assert.ok(dir.endsWith('mailer'))
    })

    it('should be a getter that computes on each access', () => {
      const transport = new FilesystemTransport()
      const dir1 = transport.outputDir
      const dir2 = transport.outputDir
      assert.equal(dir1, dir2)
    })
  })

  describe('send()', () => {
    it('should write mail data to a file', async () => {
      fsMock.writeFile.mock.resetCalls()
      const transport = new FilesystemTransport()
      const mailData = { to: 'test@test.com', subject: 'Hello' }
      await transport.send(mailData)
      assert.equal(fsMock.writeFile.mock.calls.length, 1)
      const [filePath, content] = fsMock.writeFile.mock.calls[0].arguments
      assert.ok(filePath.endsWith('.txt'))
      assert.equal(content, JSON.stringify(mailData, null, 2))
    })

    it('should use an ISO timestamp as filename', async () => {
      fsMock.writeFile.mock.resetCalls()
      const transport = new FilesystemTransport()
      await transport.send({ to: 'test@test.com' })
      const filePath = fsMock.writeFile.mock.calls[0].arguments[0]
      const filename = filePath.split('/').pop()
      assert.match(filename, /^\d{4}-\d{2}-\d{2}T.*\.txt$/)
    })

    it('should write to the outputDir', async () => {
      fsMock.writeFile.mock.resetCalls()
      const transport = new FilesystemTransport()
      await transport.send({ to: 'test@test.com' })
      const filePath = fsMock.writeFile.mock.calls[0].arguments[0]
      assert.ok(filePath.startsWith(transport.outputDir))
    })

    it('should pretty-print the JSON with 2-space indentation', async () => {
      fsMock.writeFile.mock.resetCalls()
      const transport = new FilesystemTransport()
      const data = { to: 'a@b.com', subject: 'Test' }
      await transport.send(data)
      const content = fsMock.writeFile.mock.calls[0].arguments[1]
      assert.equal(content, JSON.stringify(data, null, 2))
      assert.ok(content.includes('\n'))
    })

    it('should propagate writeFile errors', async () => {
      fsMock.writeFile.mock.mockImplementation(async () => {
        throw new Error('disk full')
      })
      const transport = new FilesystemTransport()
      await assert.rejects(() => transport.send({ to: 'a@b.com' }), { message: 'disk full' })
      fsMock.writeFile.mock.mockImplementation(async () => {})
    })
  })

  describe('test()', () => {
    it('should create the output directory if it does not exist', async () => {
      fsMock.mkdir.mock.resetCalls()
      fsMock.readdir.mock.resetCalls()
      const transport = new FilesystemTransport()
      await transport.test()
      assert.equal(fsMock.mkdir.mock.calls.length, 1)
    })

    it('should create the directory at outputDir path', async () => {
      fsMock.mkdir.mock.resetCalls()
      fsMock.readdir.mock.resetCalls()
      const transport = new FilesystemTransport()
      await transport.test()
      assert.equal(fsMock.mkdir.mock.calls[0].arguments[0], transport.outputDir)
    })

    it('should not throw if the output directory already exists', async () => {
      fsMock.mkdir.mock.resetCalls()
      fsMock.mkdir.mock.mockImplementation(async () => {
        const err = new Error('EEXIST')
        err.code = 'EEXIST'
        throw err
      })
      const transport = new FilesystemTransport()
      await assert.doesNotReject(() => transport.test())
      fsMock.mkdir.mock.mockImplementation(async () => {})
    })

    it('should throw on mkdir errors other than EEXIST', async () => {
      fsMock.mkdir.mock.resetCalls()
      fsMock.mkdir.mock.mockImplementation(async () => {
        const err = new Error('EACCES')
        err.code = 'EACCES'
        throw err
      })
      const transport = new FilesystemTransport()
      await assert.rejects(() => transport.test(), { code: 'EACCES' })
      fsMock.mkdir.mock.mockImplementation(async () => {})
    })

    it('should throw on EPERM mkdir errors', async () => {
      fsMock.mkdir.mock.resetCalls()
      fsMock.mkdir.mock.mockImplementation(async () => {
        const err = new Error('EPERM')
        err.code = 'EPERM'
        throw err
      })
      const transport = new FilesystemTransport()
      await assert.rejects(() => transport.test(), { code: 'EPERM' })
      fsMock.mkdir.mock.mockImplementation(async () => {})
    })

    it('should verify readability of the output directory', async () => {
      fsMock.mkdir.mock.resetCalls()
      fsMock.readdir.mock.resetCalls()
      const transport = new FilesystemTransport()
      await transport.test()
      assert.equal(fsMock.readdir.mock.calls.length, 1)
    })

    it('should read the outputDir to verify access', async () => {
      fsMock.mkdir.mock.resetCalls()
      fsMock.readdir.mock.resetCalls()
      const transport = new FilesystemTransport()
      await transport.test()
      assert.equal(fsMock.readdir.mock.calls[0].arguments[0], transport.outputDir)
    })

    it('should throw when readdir fails', async () => {
      fsMock.readdir.mock.mockImplementation(async () => {
        throw new Error('EACCES')
      })
      const transport = new FilesystemTransport()
      await assert.rejects(() => transport.test(), { message: 'EACCES' })
      fsMock.readdir.mock.mockImplementation(async () => [])
    })
  })
})
