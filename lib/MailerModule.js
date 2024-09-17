import { AbstractModule } from 'adapt-authoring-core'
import AbstractMailTransport from './AbstractMailTransport.js'
import FilesystemTransport from './transports/FilesystemTransport.js'
import SmtpTransport from './transports/SmtpTransport.js'
/**
 * Mailer Module
 * @memberof mailer
 * @extends {AbstractModule}
 */
class MailerModule extends AbstractModule {
  /** @override */
  async init () {
    /**
     * Reference to the isEnabled config value
     * @type {Boolean}
     */
    this.isEnabled = this.getConfig('isEnabled')
    /**
     * Reference to the connectionUrl config value
     * @type {String}
     */
    this.connectionUrl = this.getConfig('connectionUrl')
    /**
     * Registered mail transports
     * @type {Object}
     */
    this.transports = {}
    // note we still enable the API route if mailer is disabled to allow for testing
    const [auth, server] = await this.app.waitForModule('auth', 'server')
    const router = server.api.createChildRouter('mailer')
    router.addRoute({
      route: '/test',
      internal: true,
      handlers: { post: this.testEmailHandler.bind(this) },
      meta: {
        post: {
          summary: 'Send test email',
          responses: { 200: {} }
        }
      }
    })
    auth.unsecureRoute(`${router.path}/test`, 'post')

    if (this.isEnabled) {
      // add the standard transport
      this.registerTransport(FilesystemTransport)
      this.registerTransport(SmtpTransport)
      this.app.onReady().then(() => this.initTransports())
    }
  }

  registerTransport (TransportClass) {
    let t
    try {
      t = new TransportClass()
      this.transports[t.name] = t
    } catch (e) {
      this.log('error', `Failed to create transport, ${e}`)
    }
    if (!(t instanceof AbstractMailTransport)) {
      this.log('error', 'Failed to create transport, not an instance of AbstractMailTransport')
    }
    if (!t.name) {
      this.log('error', 'Failed to create transport, does not define a name')
    }
  }

  getTransport() {
    const transportName = this.getConfig('transport')
    if(!this.transports[transportName]) {
      throw new Error(`No transport with name ${transportName}`)
    }
    return this.transports[transportName]
  }

  async initTransports () {
    const transport = this.getTransport()
    try {
      await transport.test()
      this.log('info', `${transport.name} connection verified successfully`)
    } catch (e) {
      this.log('warn', `${transport.name} connection test failed, ${e}`)
    }
  }

  /**
   * Sends an email
   * @param {MailData} data The message data
   * @return {Promise}
   */
  async send (data, options = {}) {
    if (!this.isEnabled) {
      if (options.strict) throw this.app.errors.MAIL_NOT_ENABLED
      else return this.log('warn', 'could not send email, SMTP is not enabled')
    }
    if (!data.from) {
      data.from = this.getConfig('defaultSenderAddress')
    }
    try {
      const jsonschema = await this.app.waitForModule('jsonschema')
      const schema = await jsonschema.getSchema('maildata')
      await schema.validate(data)

      await this.getTransport().send(data)

      this.log('info', 'email sent successfully')
    } catch (e) {
      throw this.app.errors.MAIL_SEND_FAILED.setData({ email: data.to, error: e })
    }
  }

  /**
   * Sends a test email. Can only be called from localhost
   * @param {external:ExpressRequest} req The client request object
   * @param {external:ExpressResponse} res The server response object
   * @param {Function} next The callback function
   */
  async testEmailHandler (req, res, next) {
    if (!this.isEnabled) {
      throw this.app.errors.MAIL_NOT_ENABLED
    }
    const appUrl = (await this.app.waitForModule('server')).getConfig('url')
    try {
      await this.send({
        to: req.body.email,
        subject: 'Adapt authoring tool: email test',
        text: `Hello world!\n\nThis is a test email from ${appUrl}.\n\nRegards,\nTeam Adapt.`
      }, { strict: true })
      res.status(200).end()
    } catch (e) {
      return next(e)
    }
  }
}

export default MailerModule
