const async = require('async')

module.exports = {
  post: function (req, res, next) {
    if (!req.params.confirm_code || req.params.confirm_code.length != 32) { this.status422End(res, [{ code: 'BAD_UNSUBSCRIBE_CODE', message: 'The supplied unsubscribe code is not in the correct format', ref: req.params.confirm_code }]); return }

    let user

    async.series([
      (cb) => {
        this.mysql.query('SELECT id, first_name, last_name, email FROM user WHERE email_confirm_code = ?', [req.params.confirm_code], (err, results) => {
          if (err) { return cb(err) }
          if (results.length == 0) { return cb({ code: 'NOT_FOUND' }) }
          user = results[0]
          cb()
        })
      },
      (cb) => { this.mysql.query('UPDATE user SET email_unsubscribed=\'Y\' WHERE id = ?', [user.id], cb) }
    ], (err) => {
      if (err) {
        if (err.code == 'NOT_FOUND') return this.status404End(res, err)
        return this.status500End(res)
      }
      res.json = { code: 'OK' }
      next()
    })
  }
}
