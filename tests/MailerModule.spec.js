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

const logCalls = []
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
  },
  logger: {
    name: 'logger',
    log: (level, moduleName, ...args) => {
      logCalls.push({ level, moduleName, args })
    }
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
    logCalls.length = 0
    mockJsonSchema.getSchema = mock.fn(async () => ({
      validate: mock.fn(async () => {})
    }))
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

    it('should initialise an empty transports object before registering', () => {
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

    it('should include meta with summary for the test route', () => {
      const routeConfig = mockRouter.addRoute.mock.calls[0].arguments[0]
      assert.equal(routeConfig.meta.post.summary, 'Send test email')
      assert.ok(routeConfig.meta.post.responses[200])
    })

    it('should unsecure the test route', () => {
      const calls = mockAuth.unsecureRoute.mock.calls
      assert.ok(calls.length > 0)
      assert.ok(calls[0].arguments[0].includes('/test'))
      assert.equal(calls[0].arguments[1], 'post')
    })

    it('should unsecure the route using the full router path', () => {
      const calls = mockAuth.unsecureRoute.mock.calls
      assert.equal(calls[0].arguments[0], '/api/mailer/test')
    })

    it('should register transports when enabled', () => {
      assert.ok(Object.keys(mailer.transports).length > 0)
      assert.ok(mailer.transports.filesystem)
      assert.ok(mailer.transports.smtp)
    })

    it('should not register transports when disabled', async () => {
      const original = configValues.isEnabled
      configValues.isEnabled = false
      const disabled = new MailerModule(mockApp, { name: 'adapt-authoring-mailer', rootDir: '/test' })
      await disabled.onReady()
      assert.deepEqual(disabled.transports, {})
      configValues.isEnabled = original
    })

    it('should still create the API route when disabled', async () => {
      const original = configValues.isEnabled
      configValues.isEnabled = false
      mockRouter.addRoute.mock.resetCalls()
      const disabled = new MailerModule(mockApp, { name: 'adapt-authoring-mailer', rootDir: '/test' })
      await disabled.onReady()
      assert.ok(mockRouter.addRoute.mock.calls.length > 0)
      configValues.isEnabled = original
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

    it('should store the transport instance in transports', () => {
      class TestTransport extends AbstractMailTransport {
        name = 'test-reg'
      }
      mailer.registerTransport(TestTransport)
      assert.ok(mailer.transports['test-reg'] instanceof AbstractMailTransport)
    })

    it('should log an error when constructor throws', () => {
      logCalls.length = 0
      class BadTransport {
        constructor () { throw new Error('broken') }
      }
      mailer.registerTransport(BadTransport)
      assert.ok(logCalls.some(c => c.level === 'error' && c.args[0].includes('Failed to create transport')))
    })

    it('should log an error when transport is not an AbstractMailTransport instance', () => {
      logCalls.length = 0
      class NotATransport {
        name = 'fake'
      }
      mailer.registerTransport(NotATransport)
      assert.ok(logCalls.some(c => c.level === 'error' && c.args[0].includes('not an instance of AbstractMailTransport')))
    })

    it('should log an error when transport does not define a name', () => {
      logCalls.length = 0
      class NoNameTransport extends AbstractMailTransport {}
      mailer.registerTransport(NoNameTransport)
      assert.ok(logCalls.some(c => c.level === 'error' && c.args[0].includes('does not define a name')))
    })

    it('should not add invalid transport to the map', () => {
      class NotATransport {
        name = 'invalid-type'
      }
      mailer.registerTransport(NotATransport)
      assert.equal(mailer.transports['invalid-type'], undefined)
    })

    it('should gracefully handle constructor failure without throwing TypeError', () => {
      class BadTransport {
        constructor () { throw new Error('broken') }
      }
      assert.doesNotThrow(() => mailer.registerTransport(BadTransport))
    })

    it('should not register transport that fails instanceof check', () => {
      class NotATransport {
        name = 'not-abstract'
      }
      mailer.registerTransport(NotATransport)
      assert.equal(mailer.transports['not-abstract'], undefined)
    })

    it('should not register transport with no name', () => {
      class NoNameTransport extends AbstractMailTransport {}
      mailer.registerTransport(NoNameTransport)
      assert.equal(mailer.transports[undefined], undefined)
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

    it('should throw with the transport name in the error message', () => {
      const original = mockApp.config.get
      mockApp.config.get = () => 'missing-transport'
      assert.throws(() => mailer.getTransport(), /missing-transport/)
      mockApp.config.get = original
    })
  })

  describe('initTransports()', () => {
    it('should call test() on the configured transport and log success', async () => {
      logCalls.length = 0
      const testFn = mock.fn(async () => {})
      mailer.transports.smtp = { name: 'smtp', test: testFn }
      await mailer.initTransports()
      assert.equal(testFn.mock.calls.length, 1)
      assert.ok(logCalls.some(c => c.level === 'info' && c.args[0].includes('connection verified successfully')))
    })

    it('should include the transport name in the success message', async () => {
      logCalls.length = 0
      mailer.transports.smtp = {
        name: 'smtp',
        test: mock.fn(async () => {})
      }
      await mailer.initTransports()
      assert.ok(logCalls.some(c => c.level === 'info' && c.args[0].includes('smtp')))
    })

    it('should log a warning when transport test fails', async () => {
      logCalls.length = 0
      mailer.transports.smtp = {
        name: 'smtp',
        test: mock.fn(async () => { throw new Error('connection refused') })
      }
      await mailer.initTransports()
      assert.ok(logCalls.some(c => c.level === 'warn' && c.args[0].includes('connection test failed')))
    })

    it('should include the error in the warning message', async () => {
      logCalls.length = 0
      mailer.transports.smtp = {
        name: 'smtp',
        test: mock.fn(async () => { throw new Error('timeout') })
      }
      await mailer.initTransports()
      assert.ok(logCalls.some(c => c.level === 'warn' && c.args[0].includes('timeout')))
    })

    it('should not throw even when transport test fails', async () => {
      mailer.transports.smtp = {
        name: 'smtp',
        test: mock.fn(async () => { throw new Error('fail') })
      }
      await assert.doesNotReject(() => mailer.initTransports())
    })
  })

  describe('send()', () => {
    it('should set default from address if not provided', async () => {
      const sentData = {}
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async (data) => { Object.assign(sentData, data) })
      }
      await mailer.send({ to: 'user@test.com', subject: 'Hi' })
      assert.equal(sentData.from, 'no-reply@test.com')
    })

    it('should not override an explicit from address', async () => {
      const sentData = {}
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async (data) => { Object.assign(sentData, data) })
      }
      await mailer.send({ to: 'user@test.com', from: 'custom@test.com', subject: 'Hi' })
      assert.equal(sentData.from, 'custom@test.com')
    })

    it('should validate data against the maildata schema', async () => {
      const validateFn = mock.fn(async () => {})
      mockJsonSchema.getSchema = mock.fn(async (name) => {
        assert.equal(name, 'maildata')
        return { validate: validateFn }
      })
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => {})
      }
      await mailer.send({ to: 'user@test.com', subject: 'Hi' })
      assert.equal(validateFn.mock.calls.length, 1)
    })

    it('should call send on the configured transport', async () => {
      const sendFn = mock.fn(async () => {})
      mailer.transports.smtp = { name: 'smtp', send: sendFn }
      await mailer.send({ to: 'user@test.com', subject: 'Hi' })
      assert.equal(sendFn.mock.calls.length, 1)
      assert.equal(sendFn.mock.calls[0].arguments[0].to, 'user@test.com')
    })

    it('should log success after sending', async () => {
      logCalls.length = 0
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => {})
      }
      await mailer.send({ to: 'user@test.com', subject: 'Hi' })
      assert.ok(logCalls.some(c => c.level === 'info' && c.args[0].includes('email sent successfully')))
    })

    it('should throw MAIL_SEND_FAILED when transport.send fails', async () => {
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => { throw new Error('transport error') })
      }
      await assert.rejects(
        () => mailer.send({ to: 'user@test.com', subject: 'Hi' }),
        { message: 'Mail send failed' }
      )
    })

    it('should include email and error in MAIL_SEND_FAILED data', async () => {
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => { throw new Error('transport error') })
      }
      try {
        await mailer.send({ to: 'user@test.com', subject: 'Hi' })
        assert.fail('should have thrown')
      } catch (e) {
        assert.equal(e.email, 'user@test.com')
        assert.ok(e.error instanceof Error)
      }
    })

    it('should throw MAIL_SEND_FAILED when schema validation fails', async () => {
      mockJsonSchema.getSchema = mock.fn(async () => ({
        validate: mock.fn(async () => { throw new Error('validation failed') })
      }))
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => {})
      }
      await assert.rejects(
        () => mailer.send({ to: 'user@test.com', subject: 'Hi' }),
        { message: 'Mail send failed' }
      )
    })

    it('should log a warning and return when mailer is disabled in non-strict mode', async () => {
      logCalls.length = 0
      mailer.isEnabled = false
      await assert.doesNotReject(() => mailer.send({ to: 'user@test.com' }))
      assert.ok(logCalls.some(c => c.level === 'warn' && c.args[0].includes('SMTP is not enabled')))
      mailer.isEnabled = true
    })

    it('should throw MAIL_NOT_ENABLED in strict mode when disabled', async () => {
      mailer.isEnabled = false
      await assert.rejects(() => mailer.send({ to: 'user@test.com' }, { strict: true }))
      mailer.isEnabled = true
    })

    it('should default options to empty object', async () => {
      mailer.isEnabled = false
      await assert.doesNotReject(() => mailer.send({ to: 'user@test.com' }))
      mailer.isEnabled = true
    })

    it('should mutate the data object when setting default from', async () => {
      const data = { to: 'user@test.com', subject: 'Hi' }
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => {})
      }
      await mailer.send(data)
      assert.equal(data.from, 'no-reply@test.com')
    })
  })

  describe('testEmailHandler()', () => {
    it('should throw when mailer is disabled', async () => {
      mailer.isEnabled = false
      await assert.rejects(() => mailer.testEmailHandler({}, {}, () => {}))
      mailer.isEnabled = true
    })

    it('should throw MAIL_NOT_ENABLED when disabled', async () => {
      mailer.isEnabled = false
      await assert.rejects(
        () => mailer.testEmailHandler({}, {}, () => {}),
        { message: 'Mail not enabled' }
      )
      mailer.isEnabled = true
    })

    it('should send a test email with the correct content when enabled', async () => {
      const sendFn = mock.fn(async () => {})
      mailer.transports.smtp = { name: 'smtp', send: sendFn }
      const mockRes = { status: mock.fn(() => ({ end: mock.fn() })) }
      const req = { body: { email: 'recipient@test.com' } }
      await mailer.testEmailHandler(req, mockRes, () => {})
      assert.equal(sendFn.mock.calls.length, 1)
      const sentData = sendFn.mock.calls[0].arguments[0]
      assert.equal(sentData.to, 'recipient@test.com')
      assert.equal(sentData.subject, 'Adapt authoring tool: email test')
      assert.ok(sentData.text.includes('http://localhost'))
    })

    it('should include a greeting and sign-off in the test email', async () => {
      const sendFn = mock.fn(async () => {})
      mailer.transports.smtp = { name: 'smtp', send: sendFn }
      const mockRes = { status: mock.fn(() => ({ end: mock.fn() })) }
      await mailer.testEmailHandler({ body: { email: 'a@b.com' } }, mockRes, () => {})
      const sentData = sendFn.mock.calls[0].arguments[0]
      assert.ok(sentData.text.includes('Hello world!'))
      assert.ok(sentData.text.includes('Team Adapt'))
    })

    it('should respond with 200 on success', async () => {
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => {})
      }
      const endFn = mock.fn()
      const mockRes = { status: mock.fn(() => ({ end: endFn })) }
      await mailer.testEmailHandler({ body: { email: 'a@b.com' } }, mockRes, () => {})
      assert.equal(mockRes.status.mock.calls[0].arguments[0], 200)
      assert.equal(endFn.mock.calls.length, 1)
    })

    it('should pass errors to next() when send fails', async () => {
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => { throw new Error('send failed') })
      }
      const nextFn = mock.fn()
      const mockRes = { status: mock.fn(() => ({ end: mock.fn() })) }
      await mailer.testEmailHandler({ body: { email: 'a@b.com' } }, mockRes, nextFn)
      assert.equal(nextFn.mock.calls.length, 1)
    })

    it('should pass the error object to next()', async () => {
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => { throw new Error('send failed') })
      }
      const nextFn = mock.fn()
      const mockRes = { status: mock.fn(() => ({ end: mock.fn() })) }
      await mailer.testEmailHandler({ body: { email: 'a@b.com' } }, mockRes, nextFn)
      assert.ok(nextFn.mock.calls[0].arguments[0] instanceof Error)
    })

    it('should call send with strict option', async () => {
      const originalSend = mailer.send.bind(mailer)
      let capturedOptions
      mailer.send = mock.fn(async (data, options) => {
        capturedOptions = options
        return originalSend(data, options)
      })
      mailer.transports.smtp = {
        name: 'smtp',
        send: mock.fn(async () => {})
      }
      const mockRes = { status: mock.fn(() => ({ end: mock.fn() })) }
      await mailer.testEmailHandler({ body: { email: 'a@b.com' } }, mockRes, () => {})
      assert.deepEqual(capturedOptions, { strict: true })
    })
  })
})
