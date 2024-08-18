const async = require('async')
const path = require('path')
const fs = require('fs')

module.exports = {
  post: function (req, res, next) {
    const errs = this.validator.validate(req.body, 'invite_worker.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.mysql.asyncTransaction([
      (tr, cb) => {
        this.email.inviteWorker(req.body.first_name, req.body.last_name, req.body.email, cb)
      },
      (tr,cb) => {
        tr.query('INSERT INTO `invite` (id, first_name, last_name, email, sent_at) VALUES ((FLOOR(1 + RAND() * POW(2,63))),?,?,?,NOW())', [ req.body.first_name, req.body.last_name, req.body.email ], cb)
      }
    ], (err) => {
      if (err) { return this.status500End(res) }

      res.status(200)
      res.json = { code: 'OK' }
      next()
    })
  }
}
