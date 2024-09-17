import { App } from 'adapt-authoring-core'
/**
 * An abstract class which encompasses functions related to a single mail transport type
 * @memberof mailer
 */
class AbstractMailTransport {
  name;
  
  /**
   * Shortcut to retrieve mailer config values
   * @param {string} key 
   * @returns {String} the config value
   */
  getConfig (key) {
    return App.instance.config.get(`adapt-authoring-mailer.${key}`)
  }

  /**
   * Sends an email
   * @param {MailData} data
   */
  async send (data) {}

  /**
   * Performs any useful tests to check transport is working correctly
   */
  async test () {}
}

export default AbstractMailTransport
