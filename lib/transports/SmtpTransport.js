import AbstractMailTransport from '../AbstractMailTransport.js'
import nodemailer from 'nodemailer'
/**
 * SMTP mail transport
 * @memberof mailer
 * @extends {AbstractMailTransport}
 */
class SmtpTransport extends AbstractMailTransport {
  name = 'smtp'

  createTransport () {
    return nodemailer.createTransport(this.getConfig('connectionUrl'))
  }

  /** @override */
  async send (data) {
    return this.createTransport().sendMail(data)
  }

  /** @override */
  async test () {
    await this.createTransport().verify()
  }
}

export default SmtpTransport
