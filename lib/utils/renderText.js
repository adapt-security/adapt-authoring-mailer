/**
 * Builds the plain-text alternative for a templated email from the content
 * (not the rendered HTML) — cleaner than stripping tags from the table layout.
 * @param {object} content { title, body, button?: { label, url } }
 * @param {object} branding { appName, supportEmail }
 * @returns {string}
 */
export default function renderText (content, branding) {
  const parts = [content.title, content.body]
  if (content.button) parts.push(`${content.button.label}: ${content.button.url}`)
  parts.push(`— ${branding.appName}\nNeed a hand? ${branding.supportEmail}`)
  return parts.filter(Boolean).join('\n\n')
}
