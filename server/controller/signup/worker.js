const async = require('async')
const _ = require('underscore')
const moment = require('moment')

module.exports = {

  // POST /v1/signup/worker

  post (req, res, next) {
    const errs = this.validator.validate(req.body, 'worker_signup.post')
    if(req.body.password !== req.body.confirm_password) {
      errs.push({code: 'PASSWORDS_MUST_MATCH', message: 'The confirm_password must match password', ref: '[password, confirm_password]'})
    }
    if (errs.length > 0) return this.status422End(res, errs)

    this.mysql.asyncTransaction([
      // Email Already Exists?
      (tr,cb) => { 
        tr.query("SELECT COUNT(*) AS c FROM user WHERE email = ?", [ req.body.email ], (err, results) => {
          if(err) return cb(err)
          if(results[0].c!=0) return cb({ code:'USER_ALREADY_EXISTS', message: "A user with this email address already exists", ref: 'email'}) 
          cb()
        })
      },
      // Create user
      (tr,cb) => { 
        this.login.createLogin (req.body.email, req.body.first_name, req.body.last_name, req.body.password, 'Y', (err, data) => {
          if(err) return cb(err)
          user = data
          cb()
        })
      },
      // Update other fields if supplied
      (tr,cb) => {
        var sets = [], params = [], fields = [ 'bank_account', 'tax_code', 'ird_number', 'kiwisaver_percent', 'paysauce_id', 'phone' ]

        for(var i in fields) {
          if(req.body[fields[i]]) { sets.push('`'+fields[i]+'` = ?'); params.push(req.body[fields[i]]) }
        }

        if(sets.length===0) return cb()
        params.push(user.id)

        this.mysql.query('UPDATE `user` SET '+sets.join(',')+' WHERE `id`=?', params, cb)
      },
      // Email Login Details
      (tr,cb) => {
        this.email.loginDetails(req.body.first_name, req.body.last_name, req.body.email, req.body, user, cb)
      },
      // Notify admin of new employee
      (tr, cb) => {
        this.email.notifyAdminSignupWorker(req.body.first_name, req.body.last_name, req.body.email, req.body.industry, req.body.phone, cb)
      },
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'USER_ALREADY_EXISTS':
            return this.status409End(res, [ err ])
          default:
            return this.status500End(res)
        }
      }

      res.status(200)
      res.json = {
        code: 'OK',
        user: this.presenter.presentArray([ user ], 'user'),
      }
      next()
    })
  }
}
