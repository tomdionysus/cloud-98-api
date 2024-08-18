const async = require('async')
const _ = require('underscore')
const moment = require('moment')

module.exports = {

  // POST /v1/signup/employer

  post (req, res, next) {
    var user, organisation

    const errs = this.validator.validate(req.body, 'employer_signup.post')
    if(req.body.password !== req.body.confirm_password) {
      errs.push({code: 'PASSWORDS_MUST_MATCH', message: 'The confirm_password must match password', ref: '[password, confirm_password]'})
    }
    if (errs.length > 0) return this.status422End(res, errs)

    // Org Stuff
    req.body.id = this.mysql.bigid()
    req.body.account_id = this.mysql.bigid()
    req.body.image_id = null
    req.body.name = req.body.business_name
    req.body.invoicing_email = req.body.email
    req.body.status = 'verified'

    const table = this.schema.get('organisation')
    const data = table.getInsertData(req.body)
    const args = [table.name, data.fields, data.values]

    var subscription, subscriptionItem

    this.mysql.asyncTransaction([
      // Email Already Exists?
      (tr,cb) => { 
        tr.query("SELECT COUNT(*) AS c FROM user WHERE email = ?", [ req.body.email ], (err, results) => {
          if(err) return cb(err)
          if(results[0].c!=0) return cb({ code:'USER_ALREADY_EXISTS', message: "A user with this email address already exists", ref: 'email'}) 
          cb()
        })
      },
      // Create Org
      (tr, cb) => { tr.query('INSERT INTO ?? (??) VALUES (?)', args, cb) },
      // Create Stripe Customer
      (tr, cb) => {
        this.stripe.createCustomer(req.body.account_id, req.body.name, req.body.invoicing_email, req.body.phone_number, {
          line1: req.body.address1,
          line2: req.body.address2,
          city: req.body.city,
          state: req.body.state,
          country: req.body.country,
          postal_code: req.body.postal_code,
        }, (err, data) => {
          if(err) { return cb(err) }
          req.body.stripe_customer_id = data.id
          cb()
        })
      },
      // Create Account
      (tr, cb) => { 
        tr.query('INSERT INTO `account` (`id`,`address1`,`address2`,`city`,`state`,`postal_code`,`country`,`phone_number`,`stripe_customer_id`) VALUES (?,?,?,?,?,?,?,?,?)', [ req.body.account_id, req.body.address1, req.body.address2, req.body.city, req.body.state, req.body.postal_code, 'NZ', req.body.phone_number, req.body.stripe_customer_id ], cb) 
      },
      // Create user
      (tr,cb) => { 
        this.login.createLogin(req.body.email, req.body.first_name, req.body.last_name, req.body.password, 'Y', (err, data) => {
          if(err) return cb(err)
          user = data
          cb()
        })
      },
      // Link Org and User
      (tr,cb) => {
        tr.query('INSERT INTO `organisation_user` (id, user_id, organisation_id, roles, isdefault) VALUES (?,?,?,"manager,account","Y")', [ this.mysql.bigid(), user.id, req.body.id ], cb)
      },
      // Create Subscription
      (tr, cb) => {
        this.stripe.createSubscription(req.body.stripe_customer_id, this.stripePriceId, (err, sub, subItem) => {
          if(err) return cb(err)
          subscription = sub
          subscriptionItem = subItem
          cb()
        })
      },
      // Save Subscription, Item
      (tr, cb) => {
        tr.query('UPDATE `account` SET `stripe_subscription_id` = ?, `stripe_subscription_item_id` = ? WHERE `id`=?',[ subscription.id, subscriptionItem.id, req.body.account_id ], cb)
      },
      // Email Login Details
      (tr,cb) => {
        this.email.loginDetails(req.body.first_name, req.body.last_name, req.body.email, req.body, user, cb)
      },
      // Notify admin of new employee
      (tr, cb) => {
        this.email.notifyAdminSignupEmployer(req.body.first_name, req.body.last_name, req.body.business_name, req.body.email, req.body.industry, req.body.phone_number, cb)
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
        organisation: this.presenter.presentArray([ organisation ], 'organisation'),
      }
      next()
    })
  }
}
