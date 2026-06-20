import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import renderText from '../lib/utils/renderText.js'

const BRANDING = { appName: 'Adapt', supportEmail: 'help@adapt.com' }

describe('renderText()', () => {
  it('includes the title and body', () => {
    const out = renderText({ title: 'Reset your password', body: 'Click below.' }, BRANDING)
    assert.ok(out.includes('Reset your password'))
    assert.ok(out.includes('Click below.'))
  })

  it('renders the button as "label: url" when present', () => {
    const out = renderText({ title: 'T', body: 'b', button: { label: 'Reset', url: 'https://x/y' } }, BRANDING)
    assert.ok(out.includes('Reset: https://x/y'))
  })

  it('omits the button line when absent', () => {
    const out = renderText({ title: 'T', body: 'b' }, BRANDING)
    assert.ok(!out.includes(': http'))
  })

  it('appends the app name and support address', () => {
    const out = renderText({ title: 'T', body: 'b' }, BRANDING)
    assert.ok(out.includes('— Adapt'))
    assert.ok(out.includes('help@adapt.com'))
  })

  it('drops empty sections rather than leaving blank gaps', () => {
    const out = renderText({ title: 'T', body: '' }, BRANDING)
    assert.ok(!out.includes('\n\n\n'))
  })
})
