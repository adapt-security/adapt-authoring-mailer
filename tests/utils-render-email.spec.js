import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import renderEmail from '../lib/utils/renderEmail.js'

const TEMPLATE = `<title>{{subject}}</title>
<body style="background:{{primaryColour}}">
<span class="pre">{{preheader}}</span>
{{#emblem}}<img src="cid:emblem-{{.}}">{{/emblem}}
<h1 style="color:{{chromeColour}}">{{title}}</h1>
{{{bodyHtml}}}
{{#button}}<a href="{{url}}" style="background:{{commitColour}}">{{label}}</a>{{/button}}
<footer>{{appName}} {{supportEmail}}</footer>`

const BRANDING = {
  appName: 'Adapt',
  primaryColour: '#1ec0d9',
  chromeColour: '#263944',
  commitColour: '#00dd95',
  supportEmail: 'help@adapt.com'
}

const render = (content) => renderEmail(TEMPLATE, content, BRANDING)

describe('renderEmail()', () => {
  it('interpolates branding and title', () => {
    const out = render({ title: 'Reset your password', body: 'Hi' })
    assert.ok(out.includes('Reset your password'))
    assert.ok(out.includes('#1ec0d9'))
    assert.ok(out.includes('Adapt'))
    assert.ok(out.includes('help@adapt.com'))
  })

  it('wraps each blank-line-separated body block in a <p>', () => {
    const out = render({ title: 'T', body: 'first para\n\nsecond para' })
    assert.equal((out.match(/<p /g) || []).length, 2)
    assert.ok(out.includes('first para'))
    assert.ok(out.includes('second para'))
  })

  it('HTML-escapes body content (it is injected unescaped)', () => {
    const out = render({ title: 'T', body: 'Hello <b>there</b> & "you"' })
    assert.ok(out.includes('&lt;b&gt;there&lt;/b&gt;'))
    assert.ok(out.includes('&amp;'))
    assert.ok(!out.includes('<b>there</b>'))
  })

  it('does not re-process Mustache tokens that appear in body copy', () => {
    const out = render({ title: 'T', body: 'value is {{secret}}' })
    assert.ok(out.includes('{{secret}}'))
  })

  it('renders the emblem block only when an emblem is set', () => {
    assert.ok(render({ title: 'T', body: 'x', emblem: 'key' }).includes('cid:emblem-key'))
    assert.ok(!render({ title: 'T', body: 'x' }).includes('cid:emblem-'))
  })

  it('renders the button block only when a button is set', () => {
    const withBtn = render({ title: 'T', body: 'x', button: { label: 'Go', url: 'https://x/y?a=1&b=2' } })
    assert.ok(withBtn.includes('>Go</a>'))
    // Mustache entity-escapes the href (valid HTML; clients decode it) — verify post-decode
    const decoded = withBtn.replace(/&#x2F;/g, '/').replace(/&#x3D;/g, '=').replace(/&amp;/g, '&')
    assert.ok(decoded.includes('https://x/y?a=1&b=2'))
    assert.ok(!render({ title: 'T', body: 'x' }).includes('<a href'))
  })

  it('derives the preheader from the first body paragraph when not supplied', () => {
    const out = render({ title: 'T', body: 'preview this\n\nrest' })
    assert.ok(out.includes('"pre">preview this'))
  })

  it('uses an explicit preheader when supplied', () => {
    const out = render({ title: 'T', body: 'body text', preheader: 'custom preview' })
    assert.ok(out.includes('custom preview'))
  })
})
