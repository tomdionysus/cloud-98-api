const async = require('async')
const path = require('path')
const fs = require('fs')

module.exports = {
  post (req, res, next) {
    var isDefault, id = this.mysql.bigid()
    
    req.body.id = id

    // Validate organisation_user post
    const errs = this.validator.validate(req.body, 'organisation_user.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.mysql.asyncTransaction([
      // Check if user has no other orgs and make default org if so
      (tr, cb) => {
        tr.query('SELECT COUNT(*) AS c FROM `organisation_user` WHERE `user_id` = ?', [ req.body.user_id, req.body.organisation_id ], (err, data) => {
          if (err) return cb(err)
          isDefault = (data[0].c == 0)
          cb()
        })
      },
      (tr, cb) => { 
        tr.query('INSERT INTO `organisation_user` (`id`,`user_id`,`organisation_id`,`roles`,`isdefault`) VALUES (?,?,?,?,?)', [ id, req.body.user_id, req.body.organisation_id, req.body.roles || '', (isDefault ? 'Y':'N') ], cb)
      },
      (tr, cb) => { 
        tr.query('SELECT * FROM `organisation_user` WHERE id = ?', [ id ], cb)
      },
    ], (err, results) => {
      if (err) { return this.status500End(res) }

      res.status(200)
      res.primaryEntity = 'organisation_user'
      res.json = {
        code: 'OK',
        organisation_user: this.presenter.presentArray(results[2][0], 'organisation_user')
      }
      next()
    })
  }
}
