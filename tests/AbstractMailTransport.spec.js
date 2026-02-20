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
  })

  describe('name', () => {
    it('should be undefined by default', () => {
      const transport = new AbstractMailTransport()
      assert.equal(transport.name, undefined)
    })
  })
})
