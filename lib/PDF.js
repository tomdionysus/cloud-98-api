const pdfkit = require('pdfkit')
const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

class PDF {
  constructor (options) {
    options = options || {}

    this.logger = new ScopedLogger('PDF', options.logger || new Logger())

    options.PDF = options.PDF || pdfkit
  }

  _getFontSize (pdf, str) {
    let fontSize = 18
    pdf.fontSize(fontSize)

    while (pdf.widthOfString(str) > 245) {
      fontSize--
      pdf.fontSize(fontSize)
    }
    return fontSize
  }
}

module.exports = PDF
