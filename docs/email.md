# Transactional email

The `adapt-authoring-mailer` module sends transactional email. It offers two
entry points: a low-level `send` that posts a raw message, and a higher-level
`sendTemplated` that renders the shared branded HTML shell around caller-supplied
copy. Mail leaves the app through a pluggable transport (SMTP, or a filesystem
shim for local development).

Get the module the usual way:

```js
const mailer = await app.waitForModule('mailer')
```

## Sending raw mail: `send`

```js
await mailer.send(data, options)
```

`data` is validated against the `maildata` schema (`schema/maildata.schema.json`),
which maps onto nodemailer's message fields:

| field         | required | notes                                              |
| ------------- | -------- | -------------------------------------------------- |
| `to`          | yes      | recipient address                                  |
| `from`        | yes\*    | defaults to `defaultSenderAddress` config if unset |
| `subject`     | yes      | subject line                                       |
| `text`        | yes      | plain-text body                                    |
| `html`        | no       | HTML body                                           |
| `attachments` | no       | array of nodemailer attachment descriptors         |

\* `send` fills `from` from `defaultSenderAddress` before validation, so callers
rarely set it; after that fill, `to`/`from`/`subject`/`text` are all required.

`options`:

- `strict` (boolean) — when the mailer is disabled, throw `MAIL_NOT_ENABLED`
  instead of silently logging a warning and returning. Default `false`.

### Behaviour when disabled

If `isEnabled` is `false`, `send` does **not** send. With `strict: true` it throws
`MAIL_NOT_ENABLED`; otherwise it logs a warning and returns `undefined`. Callers
that must know whether mail went out should pass `{ strict: true }` and handle the
throw. The `/api/mailer/test` route always returns `MAIL_NOT_ENABLED` when disabled.

### Errors

On failure `send` distinguishes a connection problem from a rejected message:

- `MAIL_CONNECTION_FAILED` (502) — the mail server was unreachable. Detected from
  the nodemailer/Node error code (`ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, …).
  Carries `{ email, connectionUrl, error }`.
- `MAIL_SEND_FAILED` (500) — the transport accepted the connection but the send
  failed. Carries `{ email, error }`.

## Sending branded mail: `sendTemplated`

```js
await mailer.sendTemplated({ to, subject, content }, options)
```

This renders the shared HTML shell (`templates/default.html`) around your content,
builds a matching plain-text alternative, attaches the CID images, then hands the
result to `send`. `options` is passed straight through (e.g. `{ strict: true }`).

`content` slots:

| key      | required | meaning                                                       |
| -------- | -------- | ------------------------------------------------------------- |
| `title`  | yes      | heading shown above the body                                  |
| `body`   | yes      | plain text; blank lines become separate `<p>` paragraphs      |
| `emblem` | no       | badge image name — one of `key`, `check`, `bell`, `spark`     |
| `button` | no       | `{ label, url }` — renders a CTA button plus a fallback link  |
| `preheader` | no    | inbox preview text; defaults to the first paragraph of `body` |

The mailer is **content-agnostic**: you pass already-translated copy and runtime
values. It does not look up strings or build URLs for you.

### How content is injected

`renderEmail` (`lib/utils/renderEmail.js`) renders the Mustache template with
`{ ...branding, ...content }` plus two derived values:

- `bodyHtml` — `body` split on blank lines into escaped `<p>` blocks. This is the
  **only** slot injected unescaped (`{{{bodyHtml}}}` in the template), so the
  escaping happens here; every other slot is HTML-escaped by Mustache.
- `preheader` — `content.preheader`, else the first paragraph of `body`.

`renderText` (`lib/utils/renderText.js`) builds the plain-text alternative from the
*content* (not by stripping the HTML): title, body, an optional `label: url` line
for the button, then a `— {appName}` / `Need a hand? {supportEmail}` sign-off.

### Branding (from core)

`resolveBranding` (`lib/utils/resolveBranding.js`) gathers the branding values; it
is the seam between mailer and the rest of the app. App name and theme colours come
from **`adapt-authoring-core`**; the support address is the mailer's own config:

| branding key    | source config key                       |
| --------------- | --------------------------------------- |
| `appName`       | `adapt-authoring-core.appName`          |
| `primaryColour` | `adapt-authoring-core.primaryColour`    |
| `chromeColour`  | `adapt-authoring-core.chromeColour`     |
| `commitColour`  | `adapt-authoring-core.commitColour`     |
| `supportEmail`  | `adapt-authoring-mailer.supportEmail`   |

In the template `primaryColour` is the page background, `chromeColour` the title /
fallback-link colour, and `commitColour` the CTA button fill.

### Where the copy lives (langpack)

Email copy is **not** in this module. It lives in the language pack
(`@cgkineo/adapt-authoring-langpack-en`, `lang/en/app.json`) under `email_*` keys —
e.g. `email_invite_subject`, `email_invite_title`, `email_invite_body`,
`email_invite_button`; likewise `email_reset_*` and `email_passwordupdated_*`. These
strings interpolate `${appName}`. The calling module resolves the strings (subject,
title, body, button label) and passes the finished text in as `content` — keeping
copy translatable and the mailer agnostic.

### CID image attachments

`sendTemplated` embeds images by Content-ID rather than linking remote URLs, so they
render without the client fetching external assets. `emailAttachments` (in
`MailerModule.js`) always attaches the logo and adds the emblem badge when one is set:

- `assets/logo-cyan.png` → `cid:logo` (the template's `<img src="cid:logo">`)
- `assets/emblem-<name>.png` → `cid:emblem-<name>` — only when `content.emblem` is
  set. Shipped emblems: `emblem-key`, `emblem-check`, `emblem-bell`, `emblem-spark`.

The template shell is read once from disk and cached (`getEmailTemplate`).

## Transports

A transport is a class extending `AbstractMailTransport` that defines a `name` and
implements `send(data)` and `test()`. When enabled, the module registers the two
built-in transports on init and verifies the configured one via `test()` once the
app is ready (a failed test is logged as a warning, not fatal). The active transport
is chosen by the `transport` config value.

- **`smtp`** (`SmtpTransport`) — `nodemailer.createTransport(connectionUrl)`; `send`
  calls `sendMail`, `test` calls `verify`.
- **`filesystem`** (`FilesystemTransport`) — local shim that writes each message as a
  timestamped JSON file under `<tempDir>/mailer/` instead of sending it. Useful for
  development; `test` ensures the output directory exists and is readable.

### Registering a custom transport

```js
import AbstractMailTransport from 'adapt-authoring-mailer/lib/AbstractMailTransport.js'

class MyTransport extends AbstractMailTransport {
  name = 'mytransport'
  async send (data) { /* deliver data */ }
  async test () { /* optional connectivity check */ }
}

mailer.registerTransport(MyTransport)
```

`registerTransport` instantiates the class, checks it is an `AbstractMailTransport`
with a `name`, and stores it under that name. Set `transport` config to the name to
make it active. Use `getConfig(key)` inside a transport to read
`adapt-authoring-mailer.<key>` values.

## Configuration

From `conf/config.schema.json` (namespace `adapt-authoring-mailer`):

| key                    | type    | notes                                                            |
| ---------------------- | ------- | ---------------------------------------------------------------- |
| `isEnabled`            | boolean | master switch (default `false`); public                          |
| `transport`            | string  | active transport name (`smtp` / `filesystem`); required when on  |
| `connectionUrl`        | string  | SMTP service URI (e.g. `smtps://user:pass@host`); required for `smtp` |
| `defaultSenderAddress` | string  | fallback `from` address; required for `smtp`                     |
| `supportEmail`         | string  | support address shown in the templated-email footer             |

When `isEnabled` is `true`, `transport` is required; when `transport` is `smtp`,
`connectionUrl` and `defaultSenderAddress` are also required.

> The API route is registered even when the mailer is disabled (so the test endpoint
> can report `MAIL_NOT_ENABLED`); transports are only registered when enabled.

## Example: sending a templated invite

Resolve the translated copy from the langpack, build the activation URL, then send.
Branding (app name, colours, logo) is filled in by the mailer.

```js
const [mailer, lang, server] = await app.waitForModule('mailer', 'lang', 'server')
const appName = app.config.get('adapt-authoring-core.appName')
const url = `${server.getConfig('url')}/activate?token=${token}`

await mailer.sendTemplated({
  to: user.email,
  subject: lang.translate(req, 'app.email_invite_subject', { appName }),
  content: {
    emblem: 'key',
    title: lang.translate(req, 'app.email_invite_title', { appName }),
    body: lang.translate(req, 'app.email_invite_body', { appName }),
    button: {
      label: lang.translate(req, 'app.email_invite_button'),
      url
    }
  }
}, { strict: true })
```

The langpack keys (`email_invite_*`, `email_reset_*`, `email_passwordupdated_*`)
interpolate `${appName}`; pass it in when translating. The exact `lang.translate`
signature belongs to the lang module — adapt the call to match its API.
