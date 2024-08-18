const async = require('async')
const _ = require('underscore')
const moment = require('moment'); require('moment-timezone')

module.exports = {
  // GET /v1/account/subscription
  // Return Subscription status

  get (req, res, next) {
    let account, customer, subscription, subscriptionItem

    async.series([
      // Load Account 
      (cb) => {
        this.mysql.query('SELECT `account`.* FROM `account` WHERE id = ?' , [ req.scopes.account_id ], (err, results) => {
          if (err) return cb(err)
          account = results[0]; cb(null)
        })
      },
      // Load Records from Stripe
      (cb) => {
        if(account.subscription_type==='free') return cb()

        async.parallel({
          customer: (cb2)=>{
            this.stripe.getCustomer(account.stripe_customer_id, cb2)
          },
          subscription: (cb2)=>{
            if(account.stripe_subscription_id===null) return cb2()
            this.stripe.getSubscription(account.stripe_subscription_id, cb2)
          },
        },(err, res)=>{
          if (err) return cb(err)
          customer = res.customer
          subscription = res.subscription
          cb()
        })
      },
      // Ensure Subscription
      (cb) => {
        if(account.subscription_type==='free') return cb()
        if(subscription && subscription.canceled_at === null) return cb()

        async.series([
          // Create Subscription
          (cb2) => {
            this.stripe.createSubscription(customer.id, this.stripePriceId, (err, sub, subItem) => {
              if(err) return cb2(err)
              subscription = sub
              subscriptionItem = subItem
              cb2()
            })
          },
          // Save Subscription ID
          (cb2) => {
            this.mysql.query('UPDATE `account` SET `stripe_subscription_id` = ?, `stripe_subscription_item_id` = ? WHERE `id`=?',[ subscription.id, subscriptionItem.id, account.id ], cb2)
          }
        ], cb)
      },

      // (rcb) => {
      //   async.parallel([
      //     (cb) => { this.mysql.getAllWithIds('organisation', orgids, '`id`, `name`', cb) },
      //     (cb) => { this.mysql.getAllWithIds('premises', premids, '`id`, `name`, `address1`, `address2`, `city`, `region`, `postal_code`, `country_id`, `phone_number`, `lat`, `lng`, `organisation_id`', cb) },
      //     (cb) => { this.mysql.getAllWithIds('currency', currencyids, '*', cb) },
      //     (cb) => { this.mysql.getAllWithIds('job', jobids, 'id, name', cb) },
      //   ], rcb)
      // }
    ], (err, results) => {
      if (err) {
        this.logger.error(err)
        return this.status500End(res)
      }

      res.primaryEntity = 'subscription'
      res.json = {
        code: 'OK',
        subscription: {
          status: subscription.status,
          current_period_start: subscription.current_period_start ? moment.unix(subscription.current_period_start).toISOString() : null,
          current_period_end: subscription.current_period_end ? moment.unix(subscription.current_period_end).toISOString() : null,
          next_invoice: subscription.billing_cycle_anchor ? moment.unix(subscription.billing_cycle_anchor).toISOString() : null,
          start_date: subscription.start_date ? moment.unix(subscription.start_date).toISOString() : null,
          canceled_at: subscription.canceled_at ? moment.unix(subscription.canceled_at).toISOString() : null,
          ended_at: subscription.ended_at ? moment.unix(subscription.ended_at).toISOString() : null,
        },
        customer: this.presenter.presentArray([customer], 'customer'),
        account: this.presenter.presentArray([account],'account'),
      }
      next()
    })
  }

}
