class SchemaMock {
  constructor (options) {
    options = options || {}
    this.returnData = typeof (options.returnData) !== 'undefined' ? options.returnData : 'something'
  }

  get () { return this.returnData }
  getScopes () { return this.returnData }
  parseUrlQuery () { return this.returnData }
}

module.exports = SchemaMock
