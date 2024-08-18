const crypto = require('crypto')
const async = require('async')
const _ = require('underscore')

module.exports = {
  // POST /v1/admin/organisation
  
  post (req, res, next) {
    req.body.id = this.mysql.bigid()
    req.body.account_id = this.mysql.bigid()
    req.body.image_id = null

    const table = this.schema.get('organisation')
    res.primaryEntity = table.name

    // Validate
    const errs = this.validator.validate(req.body, table.name + '.post')
    if (errs.length > 0) {
      this.status422End(res, errs)
      return
    }

    // Get Insert Data
    const data = table.getInsertData(req.body)
    const args = [table.name, data.fields, data.values]

    this.mysql.asyncTransaction([
      (tr, cb) => { tr.query('INSERT INTO ?? (??) VALUES (?)', args, cb) },
      (tr, cb) => {
        // Create Stripe Customer
        this.stripe.createCustomer(req.body.account_id, req.body.name, req.body.invoicing_email, req.body.phone_number, {
          line1: req.body.address1,
          line2: req.body.address2,
          city: req.body.city,
          state: req.body.state,
          country: 'NZ',
          postal_code: req.body.postal_code,
        }, (err, data) => {
          if(err) { return cb(err) }
          req.body.stripe_customer_id = data.id
          cb()
        })
      },
      (tr, cb) => { 
        tr.query('INSERT INTO `account` (`id`,`address1`,`address2`,`city`,`state`,`postal_code`,`country`,`phone_number`,`stripe_customer_id`) VALUES (?,?,?,?,?,?,?,?,?)', [ req.body.account_id, req.body.address1, req.body.address2, req.body.city, req.body.state, req.body.postal_code, 'NZ', req.body.phone_number, req.body.stripe_customer_id ], cb) 
      },
      (tr, cb) => {
        // Skip Create User?
        if(req.body.create_user!=='Y') return cb()
        req.body.password = this.genPassword()
        var user

        async.series([
          (cb2) => {
            // Create manager Login
            this.login.createLogin(req.body.invoicing_email, req.body.name, 'Admin', req.body.password, 'Y', (err, data) => {
              if(err) return cb2(err)
              user = data
              this.email.loginDetails (req.body.name, 'Admin', req.body.invoicing_email, req.body, user, cb2)
            })
          },
          (cb2) => {
            // Create manager link
            tr.query('INSERT INTO `organisation_user` (id, user_id, organisation_id, roles, isdefault) VALUES (bigid(),?,?,"manager,account","Y")', [ user.id, req.body.id ], cb2)
          }
        ], cb)
      },
      // (tr, cb) => {
      //   // Skip Contract?
      //   if(req.body.email_contract!=='Y') return cb()
      //   this.email.inviteEmployer(req.body.name, req.body.invoicing_email, cb)
      // },
    ], (err, data) => {
      if (err) {
        this.status500End(res)
        return
      }

      res.status(201)
      res.json = { code: 'CREATED' }
      // Custom Presenter?
      res.json[table.name] = this.presenter.presentArray([req.body], 'organisation')
      next()
    })
  }
}
