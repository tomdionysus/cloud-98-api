const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

const StripeJS = require('stripe')
const async = require('async')
const moment = require('moment'); require('moment-timezone')

const Currency = require('./Currency')

class Stripe {
	constructor ({ logger, privateKey }) {
		this.logger = new ScopedLogger('Stripe', logger || new Logger())

		this.stripe = StripeJS(privateKey)
	}

	charge(amount, currency, tokenId, customerId, description, callback) {
		this.logger.debug('Charging '+tokenId+' '+currency.id+' '+amount+' '+description)
		const charge= {
			amount: amount,
			currency: currency.id.toLowerCase(),
			payment_method: tokenId,
			description: description,
			customer: customerId,
			confirm: true,
			off_session: true,
		}

		this.stripe.paymentIntents.create(charge, callback)
	}

	createCustomer(accountId, name, email, phone, address, callback) {
		this.logger.debug('Creating Customer '+name)
		const customer= {
			name: name,
			metadata: {
				choice_account_id: accountId,
			},
			address: address,
			email: email,
			phone: phone,
		}

		this.stripe.customers.create(customer, (err, data) => {
			if(err) { return callback(err, { code: 'STRIPE_ERROR', description: 'The Payment Provider returned an error' }) }
			callback(null, data)
		})
	}

	getCustomer(customerId, callback) {
		this.logger.debug('Getting Customer '+customerId);
		this.stripe.customers.retrieve(customerId, (err, data) => {
			if(err) { return callback(err, { code: 'STRIPE_ERROR', description: 'The Payment Provider returned an error' }) }
			callback(null, data)
		})
	}

	updateCustomer(stripeCustomerId, accountId, name, email, phone, address, callback) {
		this.logger.debug('Updating Customer '+name)
		const customer= {
			name: name,
			metadata: {
				choice_account_id: accountId,
			},
			address: address,
			email: email,
		}

		this.stripe.customers.update(stripeCustomerId, customer, (err, data) => {
			if(err) { return callback(err, { code: 'STRIPE_ERROR', description: 'The Payment Provider returned an error' }) }
			callback(null, data)
		})
	}

	attachPaymentMethodToCustomer(stripeCustomerId, paymentMethodId, callback) {
		this.logger.debug('Attaching Payment Method '+paymentMethodId+' To Customer '+stripeCustomerId)
		this.stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId }, (err, data) => {
			if(err) { return callback(err, { code: 'STRIPE_ERROR', description: 'The Payment Provider returned an error' }) }
			callback(null, data)
		})
	}

	createSubscription(stripeCustomerId, priceId, callback) {
		this.logger.debug('Creating Subscription for '+stripeCustomerId+' with Price '+priceId)
		let subscription, subscriptionItem
		this.stripe.subscriptions.create({ 
			customer: stripeCustomerId, 
			items: [ { price: priceId } ], 
			billing_cycle_anchor: moment().clone().endOf('month').unix(),
			payment_behavior: 'default_incomplete',
		}, (err, subscription) => {
			if(err) { return callback(err, { code: 'STRIPE_ERROR', description: 'The Payment Provider returned an error' }) }
			callback(null, subscription, subscription.items.data[0])
		})
	}

	getSubscription(subscriptionId, callback) {
		this.logger.debug('Getting Subscription '+subscriptionId);
		this.stripe.subscriptions.retrieve(subscriptionId, (err, data) => {
			if(err) { return callback(err, { code: 'STRIPE_ERROR', description: 'The Payment Provider returned an error' }) }
			callback(null, data)
		})
	}

	reportUsage(subscriptionItemId, quantity, callback) {
		this.logger.debug('Reporting Usage of '+subscriptionItemId+' ('+quantity+')')
		this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, { quantity: quantity, timestamp: moment().unix() }, (err, data) => {
			if(err) { return callback(err, { code: 'STRIPE_ERROR', description: 'The Payment Provider returned an error' }) }
			callback(null, data)
		})
	}

	getAPIErrorsFrom(data) {
		switch(data.type) {
			case 'StripeCardError':
			return this._apiErrorsStripeCardError(data)
			default:
			console.log(data)
			return [{code:'UNKNOWN_ERROR', description: 'An Unknown Stripe error occured' }] 
		}
	}

	_apiErrorsStripeCardError(data) {
		switch(data.code) {
			case 'card_declined':
			return [{code:'CARD_DECLINED', description: 'The charge to the card was declined' }] 
			case 'authentication_required':
			return [{code:'AUTHENTICATION_REQUIRED', description: 'This card requires 3D Secure Authentication.' }] 
			default:
			console.log(data)
			return [{code:'UNKNOWN_ERROR', description: 'An Unknown Stripe error occured' }] 
		}
	}
}

module.exports = Stripe
