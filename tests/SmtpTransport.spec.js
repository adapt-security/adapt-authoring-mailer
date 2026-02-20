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

const nodemailerMock = {
  createTransport: mock.fn(() => mockTransporter)
}

mock.module('nodemailer', {
  defaultExport: nodemailerMock
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
      nodemailerMock.createTransport.mock.resetCalls()
      const transport = new SmtpTransport()
      transport.createTransport()
      assert.equal(nodemailerMock.createTransport.mock.calls.length, 1)
    })

    it('should pass the connectionUrl config to nodemailer', () => {
      nodemailerMock.createTransport.mock.resetCalls()
      const transport = new SmtpTransport()
      transport.createTransport()
      const calledWith = nodemailerMock.createTransport.mock.calls[0].arguments[0]
      assert.equal(calledWith, 'mock-adapt-authoring-mailer.connectionUrl')
    })

    it('should return the nodemailer transporter', () => {
      const transport = new SmtpTransport()
      const result = transport.createTransport()
      assert.equal(result, mockTransporter)
    })

    it('should create a new transport on each call', () => {
      nodemailerMock.createTransport.mock.resetCalls()
      const transport = new SmtpTransport()
      transport.createTransport()
      transport.createTransport()
      assert.equal(nodemailerMock.createTransport.mock.calls.length, 2)
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

    it('should propagate sendMail errors', async () => {
      mockTransporter.sendMail.mock.mockImplementation(async () => {
        throw new Error('SMTP error')
      })
      const transport = new SmtpTransport()
      await assert.rejects(() => transport.send({ to: 'a@b.com' }), { message: 'SMTP error' })
      mockTransporter.sendMail.mock.mockImplementation(async (data) => ({ messageId: 'test-id' }))
    })

    it('should pass the complete data object to sendMail', async () => {
      mockTransporter.sendMail.mock.resetCalls()
      const transport = new SmtpTransport()
      const data = { to: 'a@b.com', from: 'c@d.com', subject: 'Hi', text: 'Body', html: '<b>Body</b>' }
      await transport.send(data)
      assert.deepEqual(mockTransporter.sendMail.mock.calls[0].arguments[0], data)
    })
  })

  describe('test()', () => {
    it('should call verify on the nodemailer transport', async () => {
      mockTransporter.verify.mock.resetCalls()
      mockTransporter.verify.mock.mockImplementation(async () => true)
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

    it('should resolve when verify succeeds', async () => {
      mockTransporter.verify.mock.mockImplementation(async () => true)
      const transport = new SmtpTransport()
      await assert.doesNotReject(() => transport.test())
    })
  })
})
