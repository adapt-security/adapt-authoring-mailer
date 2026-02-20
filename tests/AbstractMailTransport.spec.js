import { describe, it, mock, before } from 'node:test'
import assert from 'node:assert/strict'

const mockApp = {
  config: { get: mock.fn((key) => `mock-${key}`) }
}

mock.module('adapt-authoring-core', {
  namedExports: { App: { instance: mockApp } }
})

const { default: AbstractMailTransport } = await import('../lib/AbstractMailTransport.js')

describe('AbstractMailTransport', () => {
  describe('getConfig()', () => {
    before(() => mockApp.config.get.mock.resetCalls())

    it('should retrieve config values using the mailer namespace', () => {
      const transport = new AbstractMailTransport()
      const result = transport.getConfig('connectionUrl')
      assert.equal(result, 'mock-adapt-authoring-mailer.connectionUrl')
    })

    it('should pass the full namespaced key to App.instance.config.get', () => {
      mockApp.config.get.mock.resetCalls()
      const transport = new AbstractMailTransport()
      transport.getConfig('isEnabled')
      assert.equal(mockApp.config.get.mock.calls[0].arguments[0], 'adapt-authoring-mailer.isEnabled')
    })

    it('should handle different config key names', () => {
      const transport = new AbstractMailTransport()
      const result = transport.getConfig('transport')
      assert.equal(result, 'mock-adapt-authoring-mailer.transport')
    })

    it('should always prefix with adapt-authoring-mailer', () => {
      mockApp.config.get.mock.resetCalls()
      const transport = new AbstractMailTransport()
      transport.getConfig('defaultSenderAddress')
      const calledWith = mockApp.config.get.mock.calls[0].arguments[0]
      assert.ok(calledWith.startsWith('adapt-authoring-mailer.'))
    })
  })

  describe('send()', () => {
    it('should return a promise', () => {
      const transport = new AbstractMailTransport()
      const result = transport.send({ to: 'test@test.com' })
      assert.ok(result instanceof Promise)
    })

    it('should resolve without error by default', async () => {
      const transport = new AbstractMailTransport()
      await assert.doesNotReject(() => transport.send({ to: 'test@test.com' }))
    })

    it('should resolve to undefined by default', async () => {
      const transport = new AbstractMailTransport()
      const result = await transport.send({ to: 'test@test.com' })
      assert.equal(result, undefined)
    })

    it('should accept any data argument', async () => {
      const transport = new AbstractMailTransport()
      await assert.doesNotReject(() => transport.send({}))
      await assert.doesNotReject(() => transport.send(null))
      await assert.doesNotReject(() => transport.send(undefined))
    })
  })

  describe('test()', () => {
    it('should return a promise', () => {
      const transport = new AbstractMailTransport()
      const result = transport.test()
      assert.ok(result instanceof Promise)
    })

    it('should resolve without error by default', async () => {
      const transport = new AbstractMailTransport()
      await assert.doesNotReject(() => transport.test())
    })

    it('should resolve to undefined by default', async () => {
      const transport = new AbstractMailTransport()
      const result = await transport.test()
      assert.equal(result, undefined)
    })
  })

  describe('name', () => {
    it('should be undefined by default', () => {
      const transport = new AbstractMailTransport()
      assert.equal(transport.name, undefined)
    })

    it('should be assignable', () => {
      const transport = new AbstractMailTransport()
      transport.name = 'custom'
      assert.equal(transport.name, 'custom')
    })
  })

  describe('subclassing', () => {
    it('should allow overriding send()', async () => {
      class CustomTransport extends AbstractMailTransport {
        name = 'custom'

        async send (data) { return 'sent' }
      }
      const transport = new CustomTransport()
      const result = await transport.send({})
      assert.equal(result, 'sent')
    })

    it('should allow overriding test()', async () => {
      class CustomTransport extends AbstractMailTransport {
        name = 'custom'

        async test () { return 'tested' }
      }
      const transport = new CustomTransport()
      const result = await transport.test()
      assert.equal(result, 'tested')
    })

    it('should inherit getConfig from the parent', () => {
      class CustomTransport extends AbstractMailTransport {
        name = 'custom'
      }
      const transport = new CustomTransport()
      const result = transport.getConfig('someKey')
      assert.equal(result, 'mock-adapt-authoring-mailer.someKey')
    })
  })
})
