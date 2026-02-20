import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

const mockApp = {
  instance: {
    config: { get: mock.fn((key) => `mock-${key}`) }
  }
}

mock.module('adapt-authoring-core', {
  namedExports: { App: mockApp }
})

const mockTransporter = {
  sendMail: mock.fn(async (data) => ({ messageId: 'test-id' })),
  verify: mock.fn(async () => true)
}

mock.module('nodemailer', {
  defaultExport: {
    createTransport: mock.fn(() => mockTransporter)
  }
})

const { default: SmtpTransport } = await import('../lib/transports/SmtpTransport.js')
const { default: AbstractMailTransport } = await import('../lib/AbstractMailTransport.js')

describe('SmtpTransport', () => {
  describe('class', () => {
    it('should extend AbstractMailTransport', () => {
      const transport = new SmtpTransport()
      assert.ok(transport instanceof AbstractMailTransport)
    })

    it('should have name set to smtp', () => {
      const transport = new SmtpTransport()
      assert.equal(transport.name, 'smtp')
    })
  })

  describe('createTransport()', () => {
    it('should create a nodemailer transport using the connectionUrl config', () => {
      const transport = new SmtpTransport()
      transport.createTransport()
      assert.equal(mockTransporter, transport.createTransport())
    })
  })

  describe('send()', () => {
    it('should call sendMail on the nodemailer transport', async () => {
      mockTransporter.sendMail.mock.resetCalls()
      const transport = new SmtpTransport()
      const mailData = { to: 'test@test.com', subject: 'Test' }
      await transport.send(mailData)
      assert.equal(mockTransporter.sendMail.mock.calls.length, 1)
      assert.deepEqual(mockTransporter.sendMail.mock.calls[0].arguments[0], mailData)
    })

    it('should return the result from sendMail', async () => {
      const transport = new SmtpTransport()
      const result = await transport.send({ to: 'test@test.com' })
      assert.deepEqual(result, { messageId: 'test-id' })
    })
  })

  describe('test()', () => {
    it('should call verify on the nodemailer transport', async () => {
      mockTransporter.verify.mock.resetCalls()
      const transport = new SmtpTransport()
      await transport.test()
      assert.equal(mockTransporter.verify.mock.calls.length, 1)
    })

    it('should propagate verify errors', async () => {
      mockTransporter.verify.mock.mockImplementation(async () => {
        throw new Error('connection refused')
      })
      const transport = new SmtpTransport()
      await assert.rejects(() => transport.test(), { message: 'connection refused' })
      mockTransporter.verify.mock.mockImplementation(async () => true)
    })
  })
})
