class StripeMock {
  constructor (config) {
    const self = this

    config = config || {}
    this.config = config
    this.returnError = config.returnError || null
    this.recoveredError = config.recoveredError || null

    this.lockFund = (body, mysql, cb) => {
      cb(self.returnError, self.recoveredError)
    }
    this.captureFund = (body, cb) => {
      cb(self.returnError, self.recoveredError)
    }
    this.refund = (body, mysql, cb) => {
      cb(self.returnError, self.recoveredError)
    }
  }
}

module.exports = StripeMock
