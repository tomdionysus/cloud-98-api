const async = require('async')
const _ = require('underscore')

module.exports = {
  // POST /v1/admin/notify/{device_id}

  // Notify a device with a message 

  post (req, res, next) {
    const errs = this.validator.validate(req.body, 'notify.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.device.notifyDeviceById(req.params.device_id, req.body.title, req.body.body, req.body.data, (err) => {

      res.status(200)
      res.json = {
        err: err,
        code: 'OK',
      }
      next()
    })

  }
}