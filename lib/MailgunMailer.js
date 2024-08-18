const mailgun = require('mailgun-js')
const path = require('path')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')
const fs = require('fs')

class MailgunMailer {
  constructor (options = {}) {
    this.logger = new ScopedLogger('MailgunMailer', options.logger || new Logger())
    this.apiKey = options.apiKey || process.env.MAILGUN_API_KEY
    this.domain = options.domain || process.env.MAILGUN_DOMAIN
    this.mailgun = (options.mailgun || mailgun)({apiKey: this.apiKey, domain: this.domain})
    this.testMode = !!options.testMode

    if(this.testMode) this.logger.info("Test Mode is Active, no email will be sent")
  }

  connect () {
  }

  disconnect () {
  }

  getDomain () {
    return this.domain
  }

  sendMail (email, callback) {
    this.logger.info('Sending Email: ' + email.from + ' -> ' + email.to)
    if(this.testMode) {
      this.logger.info('Test Mode Email to '+email.to)
      return callback()
    }
    this.mailgun.messages().send(email, (err) => {
      if (err) {
        this.logger.error('Send Email Error: ', err)
        return callback(err)
      }
      callback()
    })
  }

  sendAsyncMail(email, callback) {
    if(this.testMode) {
      this.logger.info('Test Mode Email to '+email.to)
      return callback()
    }
    this.sendMail(email, (err, data) => {
      if (err) {
        return this.logger.error('Async Email Error: ', err)
      }
      this.logger.debug('Async Email Completed: ' + email.from + ' -> ' + email.to)
    })
    callback()
  }

  fileAttachment(filePath, filename = path.basename(filePath)) {
    return new this.mailgun.Attachment({
      data: filePath,
      filename: filename,
    })
  }
}

module.exports = MailgunMailer
