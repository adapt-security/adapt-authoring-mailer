/* global describe, it */

// const should = require('should')
const MailerUtils = require('./../lib/MailerUtils')
const data = require('./data/data')
describe('Mailer Utils', function () {
  describe('MailerUtils.isValidEmail', function () {
    data.validEmails.forEach((email) => {
      it(`should validate a correct email like ${email}`, function () {
        (MailerUtils.isValidEmail(email).should.be.true())
      })
    }
    )
    data.invalidEmails.forEach((email) => {
      it(`should invalidate an incorrect email like ${email}`, function () {
        (MailerUtils.isValidEmail(email).should.not.be.true())
      })
    }
    )
  })
  describe('MailerUtils.isValidSmtpConnectionUrl', function () {
    data.validSmtpConnectionUrls.forEach((url) => {
      it(`should validate a correct url like ${url}`, function () {
        (MailerUtils.isValidSmtpConnectionUrl(url).should.be.true())
      })
    }
    )
    data.invalidSmtpConnectionUrls.forEach((url) => {
      it(`should invalidate an incorrect url like ${url}`, function () {
        (MailerUtils.isValidSmtpConnectionUrl(url).should.not.be.true())
      })
    }
    )
  })
  describe('MailerUtils.isValidPort', function () {
    data.validPorts.forEach((port) => {
      it(`should validate a correct port like ${port}`, function () {
        (MailerUtils.isValidPort(port).should.be.true())
      })
    }
    )
    data.invalidPorts.forEach((port) => {
      it(`should invalidate an incorrect port like ${port}`, function () {
        (MailerUtils.isValidPort(port).should.not.be.true())
      })
    }
    )
  })
})
