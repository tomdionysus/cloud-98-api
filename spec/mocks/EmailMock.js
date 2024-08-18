class EmailMock {
  constructor (options) {
    options = options || {}
    this.returnData = options.returnData || null
  }

  sendMail (content, cb) { cb() }

  getDomain () { return 'DOMAIN.COM' }
}

module.exports = EmailMock
