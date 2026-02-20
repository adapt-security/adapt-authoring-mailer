import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const mockRouter = {
  path: '/api/mailer',
  addRoute: mock.fn(),
  handlers: {}
}

const mockAuth = { unsecureRoute: mock.fn() }
const mockServer = {
  api: { createChildRouter: mock.fn(() => mockRouter) },
  getConfig: mock.fn(() => 'http://localhost')
}
const mockJsonSchema = {
  getSchema: mock.fn(async () => ({
    validate: mock.fn(async () => {})
  }))
}

const configValues = {
  isEnabled: true,
  connectionUrl: 'smtp://localhost',
  transport: 'smtp',
  defaultSenderAddress: 'no-reply@test.com'
}

const mockApp = {
  config: { get: mock.fn((key) => configValues[key.split('.').pop()]) },
  waitForModule: mock.fn(async (...names) => {
    const map = { auth: mockAuth, server: mockServer, jsonschema: mockJsonSchema }
    const results = names.map(n => map[n])
    return results.length > 1 ? results : results[0]
  }),
  onReady: mock.fn(async () => {}),
  errors: {
    MAIL_NOT_ENABLED: Object.assign(new Error('Mail not enabled'), { setData: (d) => d }),
    MAIL_SEND_FAILED: { setData: (d) => Object.assign(new Error('Mail send failed'), d) }
  },
  dependencyloader: {
    moduleLoadedHook: { tap: () => {}, untap: () => {} }
  }
}

mock.module('adapt-authoring-core', {
  namedExports: {
    AbstractModule: (await import('adapt-authoring-core')).AbstractModule,
    App: { instance: mockApp }
  }
})

const { default: MailerModule } = await import('../lib/MailerModule.js')
const { default: AbstractMailTransport } = await import('../lib/AbstractMailTransport.js')

describe('MailerModule', () => {
  let mailer

  beforeEach(async () => {
    mailer = new MailerModule(mockApp, { name: 'adapt-authoring-mailer', rootDir: '/test' })
    await mailer.onReady()
  })

  describe('init()', () => {
    it('should set isEnabled from config', () => {
      assert.equal(mailer.isEnabled, true)
    })

    it('should set connectionUrl from config', () => {
      assert.equal(mailer.connectionUrl, 'smtp://localhost')
    })

    it('should initialise empty transports object', () => {
      assert.ok(typeof mailer.transports === 'object')
    })

    it('should create a child router on the server', () => {
      assert.equal(mockServer.api.createChildRouter.mock.calls.length > 0, true)
      assert.equal(mockServer.api.createChildRouter.mock.calls[0].arguments[0], 'mailer')
    })

    it('should add a /test POST route', () => {
      const addRouteCalls = mockRouter.addRoute.mock.calls
      assert.ok(addRouteCalls.length > 0)
      const routeConfig = addRouteCalls[0].arguments[0]
      assert.equal(routeConfig.route, '/test')
      assert.equal(routeConfig.internal, true)
      assert.equal(typeof routeConfig.handlers.post, 'function')
    })

    it('should unsecure the test route', () => {
      const calls = mockAuth.unsecureRoute.mock.calls
      assert.ok(calls.length > 0)
      assert.ok(calls[0].arguments[0].includes('/test'))
      assert.equal(calls[0].arguments[1], 'post')
    })

    it('should register transports when enabled', () => {
      assert.ok(Object.keys(mailer.transports).length > 0)
    })
  })

  describe('registerTransport()', () => {
    it('should register a valid transport by name', () => {
      class TestTransport extends AbstractMailTransport {
        name = 'test-transport'
      }
      mailer.registerTransport(TestTransport)
      assert.ok(mailer.transports['test-transport'])
    })
  })

  describe('getTransport()', () => {
    it('should return the configured transport', () => {
      const transport = mailer.getTransport()
      assert.equal(transport.name, 'smtp')
    })

    it('should throw if the configured transport is not registered', () => {
      const original = mockApp.config.get
      mockApp.config.get = () => 'nonexistent'
      assert.throws(() => mailer.getTransport(), /No transport with name nonexistent/)
      mockApp.config.get = original
    })
  })

  describe('send()', () => {
    it('should set default from address if not provided', async () => {
      const sentData = {}
      const originalTransport = mailer.transports.smtp
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async (data) => { Object.assign(sentData, data) })
      }
      await mailer.send({ to: 'user@test.com', subject: 'Hi' })
      assert.equal(sentData.from, 'no-reply@test.com')
      mailer.transports.smtp = originalTransport
    })

    it('should not override an explicit from address', async () => {
      const sentData = {}
      const originalTransport = mailer.transports.smtp
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async (data) => { Object.assign(sentData, data) })
      }
      await mailer.send({ to: 'user@test.com', from: 'custom@test.com', subject: 'Hi' })
      assert.equal(sentData.from, 'custom@test.com')
      mailer.transports.smtp = originalTransport
    })

    it('should log a warning and return when mailer is disabled in non-strict mode', async () => {
      mailer.isEnabled = false
      await assert.doesNotReject(() => mailer.send({ to: 'user@test.com' }))
      mailer.isEnabled = true
    })

    it('should throw MAIL_NOT_ENABLED in strict mode when disabled', async () => {
      mailer.isEnabled = false
      await assert.rejects(() => mailer.send({ to: 'user@test.com' }, { strict: true }))
      mailer.isEnabled = true
    })
  })

  describe('testEmailHandler()', () => {
    it('should throw when mailer is disabled', async () => {
      mailer.isEnabled = false
      await assert.rejects(() => mailer.testEmailHandler({}, {}, () => {}))
      mailer.isEnabled = true
    })
  })
})
