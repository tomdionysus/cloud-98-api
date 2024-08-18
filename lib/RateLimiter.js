const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')
const crypto = require('crypto')
const async = require('async')

class RateLimiter {
  constructor (options) {
    options = options || {}
    this.kvstore = options.kvstore
    this.logger = new ScopedLogger('RateLimiter', options.logger || new Logger())
    this.rpm = options.rpm || 300
    this.useHTTPHeader = typeof (options.useHTTPHeader) !== 'undefined' ? options.useHTTPHeader : true
    this.ipAddressHeader = options.ipAddressHeader || 'x-forwarded-for'
    this.handlers = []

    this.express = this._express.bind(this)
  }

  _express (req, res, next) {
    const key = this.getKey(req)

    this.kvstore.get(key, (err, data) => {
      if (err) {
        this.logger.error('Reading Key Error [%s]', key, err)
        next(err)
        return
      }

      const cb = (err) => {
        if (err) { this.logger.error('Set/Increment Error [%s]', key, err) }
        next()
      }

      if (data === undefined) {
        this.kvstore.set(key, 1, 60, cb)
      } else {
        if (data >= this.rpm) {
          if (data === this.rpm) {
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
            this.logger.info(ip + ' ' + req.method.toUpperCase() + ' ' + req.url + ' [' + res.statusCode + '] Exceeded Rate Limit '+this.rpm+"req/min, silencing further 420 logs")
            this.kvstore.increment(key, 1, (err)=>{
              if (err) { this.logger.error('Set/Increment Error [%s]', key, err) }
            })
          }
          async.eachSeries(
            this.handlers,
            (handler, cb) => { handler(req, res, cb) },
            (err) => {
              if (err) { this.logger.error('Handler Error [%s]', key, err) }
            })
        } else {
          this.kvstore.increment(key, 1, cb)
        }
      }
    })
  }

  register (handler) {
    this.handlers.push(handler)
  }

  getKey (req) {
    const hash = crypto.createHash('md5')
    const val = req.connection.remoteAddress
    if (this.useHTTPHeader && req.headers[this.ipAddressHeader]) {
      hash.update(req.headers[this.ipAddressHeader])
    }
    hash.update(val)
    const key = hash.digest('hex')
    return key
  }
}

module.exports = RateLimiter
