const async = require('async')

module.exports = {
  post: function (req, res, next) {
    const errs = this.validator.validate(req.body, 'forgot_password.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    let user; const domain = (req.protocol + '://' + req.hostname).replace('api.', '')

    async.series([
      (cb) => {
        this.login.getUserByEmail(req.body.email, (err, data) => {
          if (err) return cb(err)
          if (!data) return cb({ code: 'NOT_FOUND', ref: req.body.email })
          user = data
          cb()
        })
      },
      (cb) => {
        this.login.getPasswordResetCode(req.body.email, (err, code) => {
          if (err) return cb(err)
          if (!code) return cb({ code: 'SERVER_ERROR' })
          user.password_reset_code = code
          cb()
        })
      },
      (cb) => {
        this.email.forgotPassword({ ...user, password_reset_link: 'https://cloud98.blackraven.co.nz/reset_password?code='+user.password_reset_code }, cb)
      }
    ], (err) => {
      if (err) {
        if (err.code == 'NOT_FOUND') return this.status404End(res)
        return this.status500End(res)
      }

      res.status(200)
      res.json = { code: 'OK', user: [{ id: user.id, password_reset_code: user.password_reset_code }] }
      next()
    })
  }
}
