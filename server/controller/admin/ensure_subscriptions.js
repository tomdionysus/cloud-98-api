const async = require('async')
const _ = require('underscore')

module.exports = {
  // POST /v1/admin/ensure_subscriptions/all

  // Ensure all accounts have subscriptions

  post (req, res, next) {

  	var count = 0
  	// Get all Accounts with no subscription
  	this.mysql.query('select * from account where stripe_subscription_id IS NULL AND (select count(*) from organisation where account_id=account.id)<>0 and subscription_type<>"free" limit 5', [], (err, results) => {
			if (err) return this.status500End(res)

			async.each(results, (account, cb) => {
				var subscription, subscriptionItem

        this.stripe.createSubscription(account.stripe_customer_id, this.stripePriceId, (err, sub, subItem) => {
          if(err) return cb(err)
          subscription = sub
          subscriptionItem = subItem
          count++
          // Save Subscription, Item
          this.mysql.query('UPDATE `account` SET `stripe_subscription_id` = ?, `stripe_subscription_item_id` = ? WHERE `id`=?',[ subscription.id, subscriptionItem.id, account.id ], cb)
        })		

			}, (err) => {
				res.status(200)
				res.json = {
					err:  err,
					code: 'OK',
					fixed: count,
				}
				next()
	  	})
		})
  }
}
