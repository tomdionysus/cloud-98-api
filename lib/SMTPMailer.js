const nodemailer = require('nodemailer')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

class SMTPMailer {
  constructor (options) {
    options = options || {}
    this.logger = new ScopedLogger('SMTPMailer', options.logger || new Logger())
    this.smtpUri = options.smtpUri || 'smtp://localhost:25'
    this.domain = options.domain || 'example.com'
    this.mailer = options.mailer || nodemailer

    const smtpDetails = new URL(this.smtpUri)

    this.transportConfig = {
      host: smtpDetails.hostname,
      port: smtpDetails.port ? parseInt(smtpDetails.port) : 25,
      secure: smtpDetails.protocol === 'smtps:',
      tls: { rejectUnauthorized: false }
    }
  }

  connect () {
    this.transporter = this.mailer.createTransport(this.transportConfig)
  }

  disconnect () {
    this.transporter = null
  }

  getDomain () {
    return this.domain
  }

  sendMail (email, callback) {
    this.logger.info('Sending Email ' + email.from + ' -> ' + email.to)
    this.transporter.sendMail(email, (err) => {
      if (err) { this.logger.error('SMTPMailer Error: ', err) }
      callback(err)
    })
  }
}

module.exports = SMTPMailer
