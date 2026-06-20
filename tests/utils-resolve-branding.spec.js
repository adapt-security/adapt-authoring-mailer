import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import resolveBranding from '../lib/utils/resolveBranding.js'

describe('resolveBranding()', () => {
  const values = {
    'adapt-authoring-core.appName': 'Adapt',
    'adapt-authoring-core.primaryColour': '#1ec0d9',
    'adapt-authoring-core.chromeColour': '#263944',
    'adapt-authoring-core.commitColour': '#00dd95',
    'adapt-authoring-mailer.supportEmail': 'help@adapt.com'
  }

  it('maps app name and colours from core and support address from the mailer', () => {
    const branding = resolveBranding(key => values[key])
    assert.deepEqual(branding, {
      appName: 'Adapt',
      primaryColour: '#1ec0d9',
      chromeColour: '#263944',
      commitColour: '#00dd95',
      supportEmail: 'help@adapt.com'
    })
  })

  it('reads support address from the mailer namespace, not core', () => {
    const keys = []
    resolveBranding(key => { keys.push(key); return '' })
    assert.ok(keys.includes('adapt-authoring-mailer.supportEmail'))
    assert.ok(keys.includes('adapt-authoring-core.appName'))
  })
})
