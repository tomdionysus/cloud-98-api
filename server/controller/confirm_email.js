const async = require('async')

module.exports = {
  get: function (req, res, next) {
    const self = this

    if (!req.params.confirm_code || req.params.confirm_code.length != 32) {
      self.status400End(res, 'Incorrect code')
      return
    }

    let user

    async.series([
      function (callback) {
        self.mysql.query('SELECT id, first_name, last_name, email FROM user WHERE email_confirm_code = ? AND email_confirmed=\'N\'', [req.params.confirm_code], function (err, results) {
          if (err) { return callback(err) }

          if (results.length == 0) { return self.status404End(res, 'CODE_NOT_FOUND', { ref: req.params.confirm_code }) }

          user = results[0]
          callback(null)
        })
      },
      function (callback) {
        self.mysql.query('UPDATE user SET email_confirmed=\'Y\' WHERE id = ?', [user.id], callback)
      }
    ], function (err) {
      if (err) { return self.statusEnd(res, 500) }

      res.status(200)
      res.json = { code: 'OK', user: user }
      next()
    })
  }
}
