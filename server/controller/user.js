const async = require('async')
const path = require('path')
const fs = require('fs')

module.exports = {

  post: function (req, res, next) {
    const errs = this.validator.validate(req.body, 'user.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    var user

    async.series([
      (cb) => { 
        // Create user
        this.login.createLogin (req.body.email, req.body.first_name, req.body.last_name, req.body.password, 'Y', (err, data) => {
          if(err) return cb(err)
          user = data
          cb()
        })
      },
      (cb) => {
        // Update other fields if supplied
        var sets = [], params = [], fields = [ 'bank_account', 'tax_code', 'ird_number', 'kiwisaver_percent', 'paysauce_id' ]

        for(var i in fields) {
          if(req.body[fields[i]]) { sets.push('`'+fields[i]+'` = ?'); params.push(req.body[fields[i]]) }
        }

        if(sets.length===0) return cb()
        params.push(user.id)

        this.mysql.query('UPDATE `user` SET '+sets.join(',')+' WHERE `id`=?', params, cb)
      },
      // (cb) => {
      //   // Skip Contract?
      //   if(req.body.email_contract!=='Y') return cb()
      //   this.email.inviteWorker(req.body.first_name, req.body.last_name, req.body.email, cb)
      // },
      (cb) => {
        // Skip Details?
        if(req.body.email_details!=='Y') return cb()
        this.email.loginDetails(req.body.first_name, req.body.last_name, req.body.email, req.body, user, cb)
      },
    ], (err, results) => {
      if (err) { return this.status500End(res) }

      res.status(200)
      res.json = { code: 'OK', user: [results[0]] }
      next()
    })
  },

  patch: function (req, res, next) {
    const errs = this.validator.validate(req.body, 'user.patch_password')
    if (errs.length > 0) { return this.status422End(res, errs) }

    async.series([
      (cb) => { 
        this.login.verifyPassword(req.session.user.id, req.body.password, (err, verified) => {
          if(err) return cb(err)
          if(!verified) return cb({code: 'NOT_AUTHORIZED'})
          cb(null, true)
        })
      },
      (cb) => { this.login.resetPassword(req.session.user.id, req.body.new_password, cb) },
    ], (err) => {
      if (err) {
        if (err.code == 'NOT_AUTHORIZED') return this.status403End(res)
        return this.status500End(res)
      }

      res.status(200)
      res.json = { code: 'OK' }
      next()
    })
  },

  get: function (req, res, next) {
    this.mysql.query('SELECT * FROM `user` WHERE id = ?', [ req.session.user.id ], (err, results) => {
      if (err)  return this.status500End(res)

      res.status(200)
      res.primaryEntity = 'user'
      res.json = { 
        code: 'OK',
        user:  this.presenter.presentArray(results, 'user'),
      }
      next()
    })
  },

  delete: function (req, res, next) {
    // Archive Current User

    this.mysql.asyncTransaction([
      // Archive User
      (tr, cb) => {
        tr.query('INSERT INTO `archive_user` SELECT *, NOW() FROM `user` WHERE `id` = ?', [ req.session.user.id ], cb)
      },
      // Delete User from user table
      (tr, cb) => {
        tr.query('DELETE FROM `user` WHERE `id` = ?', [ req.session.user.id ], cb)
      },
      // Log Out
      (tr, cb) => { 
        this.session.delete(req.session.id,cb)
      },
    ], (err, results) => {
      if (err) { return this.status500End(res) }

      res.status(200)
      res.json = {
        code: 'OK',
      }
      next()
    })
  }
}
