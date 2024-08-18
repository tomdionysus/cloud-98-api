const _ = require('underscore')

class AWSMock {
  constructor (options) {
    options = options || {}
    this.returnError = options.returnError || null
    this.returnData = options.returnData || null
    this.passedCallback = null
  }

  putObject (fileName, callback) { callback(this.returnError) }
  getObject (filename, callback) {
    if (_.isFunction(callback)) { return callback(this.returnError, this.returnData) }
    return { createReadStream: () => { return this.returnData } }
  }

  createWriteStream () { return this.returnData }
  createReadStream () { return this.returnData }
  deleteObject (fileName, callback) { callback(this.returnError) }
  headObject (fileName, callback) { callback(this.returnError) }
  upload (params, callback) { this.passedCallback = callback; return this.returnData }
}

module.exports = AWSMock
