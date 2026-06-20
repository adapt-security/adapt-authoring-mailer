# adapt-authoring-mailer
Initial version of the adapt-authoring mailer module

## Configuration

Add this snippet (just as example!) to dev.config.js
    
    ...
    ,
       "adapt-authoring-mailer": {
        "isEnabled": true,
        "connectionUrl": "smtp://some@service.email:xyz@smtp.service.email"
    },
      
      

The `defaultSenderAddress` and `supportEmail` values are used as the sender and the
footer support contact for templated emails.

## Sending templated emails

`sendTemplated()` renders a single branded HTML shell (`templates/email.html`) and sends it
as a multipart text + HTML message. The mailer is content-agnostic — callers supply
already-translated copy and the runtime values; branding (app name, theme colours) is read
from config and the logo/emblem are CID-embedded.

    await mailer.sendTemplated({
      to: 'user@example.com',
      subject: 'Reset your password',
      content: {
        emblem: 'key',                 // optional: spark | key | check | bell
        title: 'Reset your password',
        body: 'We received a request to reset your password.\n\nThis link expires in 30 minutes.',
        button: { label: 'Reset password', url: resetUrl }  // optional
      }
    })

- `body` is plain text; blank lines become separate paragraphs and the text is HTML-escaped.
- `emblem` and `button` are optional; everything else is required.
- Branding comes from `adapt-authoring-core` (`appName`, `primaryColour`, `chromeColour`,
  `commitColour`) and the mailer's own `supportEmail`.
- Copy should live in a langpack and be translated by the caller — keep wording out of the
  template so emails stay localisable.

## Known problems

On windows, if you get an error message like "error self signed certificate in certificate chain", it might be due your 
antivirus scanner: see https://github.com/nodemailer/nodemailer/issues/406




 


