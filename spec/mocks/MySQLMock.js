const async = require('async')
const crypto = require('crypto')
const Mock = require('./Mock')

// Mock mysql class for testing

class MySQLMock extends Mock {
  constructor (config) {
    super(config)
    config = config || {}
    this.config = config
    this.returnError = config.returnError || null
    this.returnData = config.returnData || [{ field: 1 }]
    this.returnFields = config.returnFields || { field: 1 }

    this.errorAfterXCalls = 0

    this.dataArray = null
    this.dataCount = 0

    spyOn(this, 'query').and.callThrough()
    spyOn(this, 'rollback').and.callThrough()
    spyOn(this, 'commit').and.callThrough()
    spyOn(this, 'begin').and.callThrough()
    spyOn(this, 'asyncTransaction').and.callThrough()
  }

  query (query, params, cb) {
    const err = ((this.errorAfterXCalls--) <= 0) ? this.returnError : null
    if (this.dataArray && this.dataCount < this.dataArray.length) {
      cb(err, this.dataArray[this.dataCount++], this.returnFields)
    } else {
      cb(err, this.returnData, this.returnFields)
    }
  }

  // Mock asyncTransaction
  rollback (cb) {
    cb(this.returnError)
  }

  commit (cb) {
    cb(this.returnError)
  }

  begin (cb) {
    cb()
  }

  // Wrap an async.series in a transaction, with chain truncation and rollback on error.
  //  asyncTransaction([fn1, fn2, fn3...],finalCallback)
  //  fn1 = function(transaction, callback)
  // Copy from mysql engine. Transaction is actually replaced by self
  asyncTransaction (fns, callback) {
    const self = this
    let transaction = null
    const tfns = []
    // Add Begin transaction
    tfns.push((callback) => {
      self.begin(() => {
        transaction = self
        callback()
      })
    })
    // Add User Functions
    for (let i = 0; i < fns.length; i++) {
      const fn = { f: fns[i] }
      tfns.push(function (cb) { return this.f(transaction, cb) }.bind(fn))
    }
    // Add Commit at end
    tfns.push((callback) => { transaction.commit(callback) })
    // Final Callback
    const fin = (err, results) => { callback(err, results) }
    // Do Async
    async.series(tfns, (err, results) => {
      // Dump begin result
      results.shift()
      // Dump commit result if any
      if (results.length > fns.length) results.pop()
      // On Error rollback
      if (err) {
        // Edge case where begin failed
        if (!transaction) { return fin(err, results) }
        // Do Rollback
        return transaction.rollback(() => { fin(err, results) })
      }
      // Call final
      fin(err, results)
    })
  }

  bigid () { return MySQLMock.bigid() }
  static bigid () {
    return BigInt('0x' + crypto.randomBytes(8).toString('hex')).toString()
  }
}

module.exports = MySQLMock
