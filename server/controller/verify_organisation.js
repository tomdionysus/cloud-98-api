const crypto = require('crypto')
const async = require('async')
const _ = require('underscore')

module.exports = {
  // POST /v1/admin/organisation/{organisation_id}/verify
  
  post (req, res, next) {
    var org, account = {}, stripe = { }

    this.mysql.asyncTransaction([
      (tr, cb) => { 
        tr.query('SELECT * FROM `organisation` WHERE id = ?', [ req.params.organisation_id ], (err, data) => {
          if(err) { return cb(err) }
          if(data.length===0) { return cb({code: 'NOT_FOUND', description: 'The organistion was not found'}) }
          org = data[0]
          cb()
        }) 
      },
      (tr, cb) => { 
        // Get the account details
        tr.query('SELECT * FROM `account` WHERE id = ?', [ org.account_id ], (err, data) => {
          if(err) { return cb(err) }
          if(data.length>0) {
            account = data[0]
            this.logger.debug("Existing Account for org "+ req.params.organisation_id+" is "+ account.id)
            return cb()
          }
          this.logger.debug("Creating Account for org "+ req.params.organisation_id )
          // No, create account and update org
          org.account_id = this.mysql.bigid()
          tr.query('INSERT INTO `account` (id, default_currency_id, country) VALUES (?,?,?)', [ org.account_id, 'NZD', 'NZ' ], (err, data) => {
            if(err) { return cb(err) }
            account = { id: org.account_id, default_currency_id: 'NZD', country: 'NZ' }
            this.logger.debug("Updating Account for org "+ req.params.organisation_id )
            tr.query("UPDATE `organisation` SET `account_id` = ? WHERE id = ?", [ org.account_id, req.params.organisation_id ], cb)
          })
        })
      },
      (tr, cb) => {
        // Is the stripe customer ID set?
        if(account.stripe_customer_id) { 
          this.logger.debug("Existing Stripe for org "+ req.params.organisation_id+" is "+ account.stripe_customer_id)
          return cb() 
        }
        // Create Stripe Customer
        this.logger.debug("Creating Stripe for org "+ req.params.organisation_id)
        this.stripe.createCustomer(org.account_id, org.name, org.invoicing_email, org.phone_number, {
          line1: org.address1,
          line2: org.address2,
          city: org.city,
          state: org.state,
          country: 'NZ',
          postal_code: org.postal_code,
        }, (err, data) => {
          if(err) { return cb(err) }
          account.stripe_customer_id = data.id
          // Update stripe customer id in account
          this.logger.debug("Updating Stripe for org "+ req.params.organisation_id)
          tr.query('UPDATE `account` SET `stripe_customer_id` = ? WHERE id = ?', [ account.stripe_customer_id, org.account_id ], cb)
        })
      },
    ], (err, data) => {
      if (err) {
        switch(err.code) {
          case 'NOT_FOUND':
          return this.status404End(res,[err])
          default:
          return this.status500End(res)
        }
      }

      res.status(200)
      res.json = { 
        code: 'OK',
        organisation: org,
        account: account,
        stripe: stripe,
      }

      next()
    })
  }
}
