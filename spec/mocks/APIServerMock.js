class APIServerMock {
  constructor (options) {
    options = options || {}
    this.returnError = options.returnError || null
    this.returnStatus = options.returnStatus || null
    this.returnData = options.returnData || null
  }

  status401End (res) { this.returnData = res; return this }
}

module.exports = APIServerMock
