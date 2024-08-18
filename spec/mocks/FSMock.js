class FSMock {
  constructor (options) {
    options = options || {}
    this.returnError = options.returnError || null
    this.returnData = options.returnData || null
    this.watchCallback = options.watchCallback || function () {}
  }

  writeFile (fileName, fileData, callback) { callback(this.returnError) }
  readFile (filename, callback) { callback(this.returnError, this.returnData) }
  createWriteStream () { return this.returnData }
  createReadStream () { return this.returnData }
  unlink (fileName, callback) { callback(this.returnError) }
  access (fileName, mode, callback) { callback(this.returnError) }
  watch (fileName, callback) { this.returnData = fileName; this.watchCallback = callback }
  _doWatchCallback (evt) { this.watchCallback(evt) }
}

FSMock.prototype.constants = { F_OK: 1 }

module.exports = FSMock
