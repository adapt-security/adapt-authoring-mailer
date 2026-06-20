/**
 * Gathers branding values for templated emails from app config — app name and
 * theme colours from core, support address from the mailer's own config.
 * @param {Function} getConfig (key) => value, e.g. app.config.get
 * @returns {object} { appName, primaryColour, chromeColour, commitColour, supportEmail }
 */
export default function resolveBranding (getConfig) {
  return {
    appName: getConfig('adapt-authoring-core.appName'),
    primaryColour: getConfig('adapt-authoring-core.primaryColour'),
    chromeColour: getConfig('adapt-authoring-core.chromeColour'),
    commitColour: getConfig('adapt-authoring-core.commitColour'),
    supportEmail: getConfig('adapt-authoring-mailer.supportEmail')
  }
}
