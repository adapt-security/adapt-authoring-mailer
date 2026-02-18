/* global before describe, it */

const nodemailer = require('nodemailer')
const { App } = require('adapt-authoring-core')

describe('Mailer module', function () {
  before(async function () {
    this.mailer = await App.instance.waitForModule('mailer')

    const { user, pass, smtp } = await nodemailer.createTestAccount()

    App.instance.config._config[`${this.mailer.name}.enable`] = true
    App.instance.config._config[`${this.mailer.name}.useConnectionUrl`] = true
    App.instance.config._config[`${this.mailer.name}.connectionUrl`] = `smtp://${user}:${pass}@${smtp.host}:${smtp.port}`

    await this.mailer.init()
  })
  describe('#initialise()', function () {
    it('should be able to test valid SMTP credentials', async function () {
      await this.mailer.testConnection()
    })
    it('should be able to send an email', async function () {
      const message = {
        to: 'test@mail.com',
        subject: 'Hello',
        text: 'Plaintext version of the message',
        html: '<p>HTML version of the message</p>'
      }
      const data = await this.mailer.send(message)
      data.accepted.length.should.equal(1)
    })
  })
})
