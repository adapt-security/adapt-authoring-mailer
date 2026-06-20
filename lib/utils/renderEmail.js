import Mustache from 'mustache'

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Plain-text body (paragraphs separated by blank lines) -> escaped <p> blocks.
// The body is the only slot injected unescaped ({{{bodyHtml}}}), so escape it here.
const toParagraphs = (body) => String(body).trim().split(/\n\s*\n/)
  .map(p => `<p style="font-size:15px;line-height:1.65;color:#4d4d4d;margin:0 0 14px;">${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
  .join('')

/**
 * Renders the shared email shell with caller content and resolved branding.
 * @param {string} template The Mustache shell (templates/default.html)
 * @param {object} content { emblem?, title, body, button?: { label, url }, preheader? }
 * @param {object} branding { appName, primaryColour, chromeColour, commitColour, supportEmail }
 * @returns {string} HTML
 */
export default function renderEmail (template, content, branding) {
  const body = content.body ?? ''
  return Mustache.render(template, {
    ...branding,
    ...content,
    bodyHtml: toParagraphs(body),
    preheader: content.preheader || body.trim().split(/\n\s*\n/)[0].trim()
  })
}
