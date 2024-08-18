const crypto = require('crypto')
const async = require('async')
const _ = require('underscore')

module.exports = {

  // POST /v1/device

  // Register a user device

  post (req, res, next) {
    // Validate notification patch
    const errs = this.validator.validate(req.body, 'device.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    var device

    this.mysql.asyncTransaction([
      // Check if notification exists and is status=created
      (tr, cb) => {
        tr.query('SELECT `id`,`device_id` FROM `device` WHERE `device_id` = ?', [ req.body.device_id ], (err, data) => {
          if (err) return cb(err)
          if (data.length !== 0) device = data[0]
          cb()
        })
      },
      (tr, cb) => { 
        if(device) return cb()
        device = { id: this.mysql.bigid(), qr_code: crypto.randomBytes(16).toString('hex') }
        tr.query('INSERT INTO `device` (`id`,`device_id`,`device_name`,`push_token`,`qr_code`,`registered_utc`,`last_seen_utc`,`user_id`) VALUES (?,?,?,?,?,NOW(),NOW(),?)', [ device.id, req.body.device_id, req.body.device_name, req.body.push_token, device.qr_code, req.session.user.id ], cb)
      },
      (tr, cb) => { 
        tr.query('UPDATE `device` SET `last_seen_utc` = NOW(), `device_name` = ?, `push_token` = ? WHERE id = ?', [ req.body.device_name, req.body.push_token, device.id ], cb)
      },
      (tr, cb) => { 
        tr.query('SELECT `id`,`device_id`,`device_name`,`push_token`,`qr_code`,`registered_utc`,`last_seen_utc` FROM `device` WHERE id = ?', [ device.id ], cb)
      },
    ], (err, results) => {
      if (err) { return this.status500End(res) }

      res.status(200)
      res.primaryEntity = 'device'
      res.json = {
        code: 'OK',
        device: this.presenter.presentArray(results[3][0], 'device')
      }
      next()
    })
  }

}
