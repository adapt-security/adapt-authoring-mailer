import { AbstractModule } from 'adapt-authoring-core';
import MailerUtils from './MailerUtils.js';
import nodemailer from 'nodemailer';
/**
 * Mailer Module
 * @extends {AbstractModule}
 */
export default class MailerModule extends AbstractModule {
  /** @override */
  async init() {
    /**
     * Whether the current connection settings have been verified
     * @type {Boolean}
     */
    this.isConnectionVerified = false;
    /**
     * The Nodemailer SMTP transport instance
     * @type {Nodemailer~Transport}
     */
    this.transporter = null;
    await this.readConfig();
    if (this.isEnabled && this.validateConfig()) {
      this.transporter = this.createTransporter();
    }
    this.emit('ready', this);
  }
  /**
   * Read config and create corresponding members
   * @return {Promise}
   */
  async readConfig() {
    await this.app.waitForModule('config');
    /**
     * Reference to the isEnabled config value
     * @type {Boolean}
     */
    this.isEnabled = this.getConfig('isEnabled');
    /**
     * Reference to the connectionUrl config value
     * @type {String}
     */
    this.connectionUrl = this.getConfig('connectionUrl');
  }
  /**
   * Validate configuration values
   * @return {Boolean}
   */
  validateConfig() {
    let isValid = MailerUtils.isValidSmtpConnectionUrl(this.connectionUrl);
    if (!isValid) this.log('warn', this.app.lang.t("error.smtpUrlValidationFailed", {url: this.connectionUrl}));
    return isValid;
  }
  /**
   * Setup nodemailers transporter
   */
  createTransporter() {
    let transporter = null;
    try {
      transporter = nodemailer.createTransport(this.connectionUrl);
    } catch (e) {
    } finally {
      return transporter;
    }
  }
  /**
   * Processes a message, and returns a nicely formatted error
   * @param {String} prefixKey Lang key for the generic return error message
   * @param {Error|String} error The error
   * @param {Error|String} statusCode The HTTP status code
   * @return {Error}
   */
  formatError(prefixKey, error = '', statusCode = 500) {
    const e = new Error(`${this.app.lang.t(`error.${prefixKey}`)} ${error.message || error}`);
    e.statusCode = error.statusCode || statusCode;
    return e;
  }
  /**
   * Checks the provided SMTP settings using nodemailer.verify.
   * @return {Promise}
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      this.log('info', this.app.lang.t("info.smtpVerified"));
      return true;
    } catch(e) {
      this.log('warn', this.app.lang.t("info.smtpByUrlVerifyFailed", { url: this.connectionUrl, error }));
      return false;
    }
  }
  /**
   * Sends an email
   * @param {object} message The message data
   * @param {object} message.to Comma separated list or an array of recipients email addresses that will appear on the To: field
   * @param {object} message.subject The subject of the email
   * @param {object} message.text The plain text version of the message as an unicode string
   * @param {object} message.html The HTML version of the message as a unicode string
   * @return {Promise}
   */
  async send(message) {
    if (!this.isEnabled || !this.transporter) {
      this.log('warn', 'Mailer#testConnection()', this.app.lang.t("info.smtpNotEnabled"));
      return;
    }
    if (!this.isConnectionVerified) {
      this.isConnectionVerified = await this.testConnection();
    }
    if (!this.isConnectionVerified) {
      return this.log('warn', 'Mailer#send()', this.app.lang.t("error.smtpUrlValidationFailed"));
    }
    if (!MailerUtils.isValidEmail(message.to)) {
      return this.log('warn', 'Mailer#send()', this.app.lang.t("error.smtpEmailValidationFailed", { email: message.to }));
    }
    try {
      this.log('info', `${this.app.lang.t('info.sentSuccessfully')} ${(await this.transporter.sendMail(message)).response}`);
    } catch(e) {
      this.log('error', 'error.sendFailed');
      throw new Error(this.formatError('sendFailed', e));
    }
  }
}