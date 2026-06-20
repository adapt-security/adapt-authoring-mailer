import { AbstractModule } from 'adapt-authoring-core'
import { loadRouteConfig, registerRoutes } from 'adapt-authoring-server'
import fs from 'node:fs/promises'
import path from 'node:path'
import AbstractMailTransport from './AbstractMailTransport.js'
import FilesystemTransport from './transports/FilesystemTransport.js'
import SmtpTransport from './transports/SmtpTransport.js'
import { renderEmail, renderText, resolveBranding } from './utils.js'

// Node/nodemailer codes that mean the mail server was unreachable, as opposed
// to the message being rejected — lets us flag the difference to operators.
const CONNECTION_ERROR_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH']

function isConnectionError (e) {
  if (!e) return false
  if (CONNECTION_ERROR_CODES.includes(e.code)) return true
  return typeof e.message === 'string' && CONNECTION_ERROR_CODES.some(code => e.message.includes(code))
}

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
    const config = await loadRouteConfig(this.rootDir, this)
    const router = server.api.createChildRouter(config.root)
    registerRoutes(router, config.routes, auth)

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
    } catch (e) {
      this.log('error', `Failed to create transport, ${e}`)
      return
    }
    if (!(t instanceof AbstractMailTransport)) {
      this.log('error', 'Failed to create transport, not an instance of AbstractMailTransport')
      return
    }
    if (!t.name) {
      this.log('error', 'Failed to create transport, does not define a name')
      return
    }
    this.transports[t.name] = t
  }

  getTransport () {
    const transportName = this.getConfig('transport')
    if (!this.transports[transportName]) {
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
      schema.validate(data)

      await this.getTransport().send(data)

      this.log('info', 'email sent successfully')
    } catch (e) {
      if (isConnectionError(e)) {
        const connectionUrl = this.getConfig('connectionUrl')
        this.log('error', `Could not connect to the mail server at ${connectionUrl}; check it is running and connectionUrl is correct. Cause: ${e}`)
        throw this.app.errors.MAIL_CONNECTION_FAILED.setData({ email: data.to, connectionUrl, error: e })
      }
      this.log('error', `Failed to send email to ${data.to}. Cause: ${e}`)
      throw this.app.errors.MAIL_SEND_FAILED.setData({ email: data.to, error: e })
    }
  }

  /**
   * Renders a branded email from the shared template/assets and sends it. The
   * mailer is content-agnostic: callers supply already-translated copy and the
   * runtime values; branding (app name, colours) is resolved from config and the
   * logo/emblem are CID-embedded.
   * @param {object} message
   * @param {string} message.to Recipient email address
   * @param {string} message.subject Subject line (already translated)
   * @param {object} message.content { emblem?, title, body, button?: { label, url } }
   * @param {object} [options] Passed through to {@link MailerModule#send} (e.g. { strict: true })
   * @return {Promise}
   */
  async sendTemplated ({ to, subject, content }, options = {}) {
    const branding = resolveBranding(key => this.app.config.get(key))
    const template = await this.getEmailTemplate()
    return this.send({
      to,
      subject,
      text: renderText(content, branding),
      html: renderEmail(template, content, branding),
      attachments: this.emailAttachments(content.emblem)
    }, options)
  }

  /**
   * Reads (and caches) the shared email shell template
   * @return {Promise<String>}
   */
  async getEmailTemplate () {
    if (!this._emailTemplate) {
      this._emailTemplate = await fs.readFile(path.join(this.rootDir, 'templates/email.html'), 'utf8')
    }
    return this._emailTemplate
  }

  /**
   * Builds the CID image attachments for a templated email: the logo always,
   * plus the named emblem badge when one is set.
   * @param {String} [emblem] One of the assets/emblem-*.png names (e.g. 'key')
   * @return {Object[]} nodemailer attachment descriptors
   */
  emailAttachments (emblem) {
    const dir = path.join(this.rootDir, 'assets')
    const attachments = [{ filename: 'logo-cyan.png', path: path.join(dir, 'logo-cyan.png'), cid: 'logo' }]
    if (emblem) {
      attachments.push({ filename: `emblem-${emblem}.png`, path: path.join(dir, `emblem-${emblem}.png`), cid: `emblem-${emblem}` })
    }
    return attachments
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
