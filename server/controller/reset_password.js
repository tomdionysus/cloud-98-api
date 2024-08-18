const async = require('async')
const path = require('path')
const fs = require('fs')

module.exports = {
  post: function (req, res, next) {
    const errs = this.validator.validate(req.body, 'user.reset_password')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.login.resetPasswordWithCode(req.body.reset_code, req.body.new_password, (err) => {
      if (err) {
        if (err.code == 'NOT_FOUND') return this.status403End(res)
        return this.status500End(res)
      }

      res.status(200)
      res.json = { code: 'OK' }
      next()
    })
  }
}
