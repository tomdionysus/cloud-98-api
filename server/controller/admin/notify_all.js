const async = require('async')
const _ = require('underscore')
const { getBoundsOfDistance } = require('geolib')

module.exports = {
  // POST /v1/admin/notify/all

  // Notify all devices of with a message 

  post (req, res, next) {
    const errs = this.validator.validate(req.body, 'notify.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.device.notifyAllDevices(req.body.title, req.body.body, req.body.data, (err) => {
      if (err) return this.status500End(res)

      res.status(200)
      res.json = {
        code: 'OK',
      }
      next()
    })

  }
}