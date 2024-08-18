class PdfMock {
  constructor (options) {
    options = options || {}
    this.returnData = options.returnData || null
  }

  createTicketsPDF (content, cb) { cb({ end: () => {} }) }
}

module.exports = PdfMock
