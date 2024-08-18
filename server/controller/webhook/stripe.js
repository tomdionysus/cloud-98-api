const async = require('async')
const _ = require('underscore')
const stripe = require('stripe')
const moment = require('moment')

module.exports = {
  // POST /v1/webhook/432A462D4A614E645267556B58703273357638792F423F4528472B4B62506553

  post (req, res, next) {

    var event = req.body

    // Authenticate Stripe Message
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, req.get('stripe-signature') , this.stripeWebhookSigningSecret)
    } catch (err) {
      this.logger.error("Stripe Webhook Request has bad signature")
      return this.status400End(res, [ { code: 'BAD_SIGNATURE', message: 'The request signature is incorrect' } ])
    }

    var eventObject = event.data?.object

    // Setup Stripe log data
    var insertData = {
      id: this.mysql.bigid(),
      event_id: req.body.id,
      account_id: null,
      stripe_customer_id: null,
      organisation_id: null,
      event_type: event.type,
      created_utc: moment(),
      event_data: eventObject,
      handled: 'Y',
    }

    this.logger.info('Stripe Webhook Event: '+event.type+ '('+insertData.id+')') 

    var account

    this.mysql.asyncTransaction([
      // Get the context
      (tr,cb) => {
        switch(eventObject.object) {
          case "customer":
            insertData.stripe_customer_id = eventObject.id
            tr.query('SELECT * FROM `account` WHERE `stripe_customer_id` = ?',[ eventObject.id ], (err, result) => {
              if(err) return cb(err)
              if(result.length===0) {
                this.logger.error('Cannot Find Account for customer '+eventObject.id)
                return cb({ code: 'CUSTOMER_NOT_FOUND', message: 'Cannot Find Account for customer', ref: eventObject.id })
              }
              account = result[0]
              insertData.account_id = result[0].id
              cb()
            })
          break
          case "invoice":
            insertData.stripe_customer_id = eventObject.customer
            tr.query('SELECT * FROM `account` WHERE `stripe_customer_id` = ?',[ eventObject.customer ], (err, result) => {
              if(err) return cb(err)
              if(result.length===0) {
                this.logger.error('Cannot Find Account for customer '+eventObject.customer)
                return cb({ code: 'CUSTOMER_NOT_FOUND', message: 'Cannot Find Account for customer', ref: eventObject.customer })
              }
              account = result[0]
              insertData.account_id = result[0].id
              cb()
            })
          break
          default:
            cb()
          break
        }
      },
      // Handle the Event
      (tr, cb) => {
        switch (event.type) {
          case 'customer.created':
            this.logger.info('Stripe Customer Created: '+JSON.stringify(event))
            cb()
          break
          case 'customer.updated':
            this.logger.info('Stripe Customer Updated: '+JSON.stringify(event))
            cb()
          break
          case 'invoice.upcoming':
            // Report the total number distinct premises with published shifts for all orgs with this 
            this.mysql.query('SELECT COUNT(DISTINCT `shift`.`premises_id`) AS c FROM `shift`,`organisation` WHERE `shift`.`status`="published" and `shift`.`organisation_id`=`organisation`.`id` AND `organisation`.`status` <> "hold" AND `organisation`.`account_id` = ?', [ account.id ], (err, results) => {
              if (err) return cb(err)
              this.stripe.reportUsage(account.stripe_subscription_item_id, results[0].c, cb)
            })
            // TODO: Email upcoming invoice to account
          break
          case 'invoice.paid':
            this.logger.info('Stripe Invoice Paid: '+JSON.stringify(event))
            // If the invoice is paid and the customer balance is zero...
            if (eventObject.status === 'paid' && eventObject.ending_balance === 0) {
              // Reactivate all organisations attached to this account id
              tr.query('UPDATE `organisation` SET `status` = "verified" WHERE `account_id` = ? AND `status` = "hold"',[ account.id ], cb)
            } else {
              // There's still an outstanding balance, so nothing happens.
              cb()
            }
            // TODO: Email customer telling them they've paid their invoice
          break
          case 'invoice.payment_failed':
            this.logger.info('Stripe Invoice Payment Failed: '+JSON.stringify(event))
            // Deactivate all organisations attached to this account
            tr.query('UPDATE `organisation` SET `status` = "hold" WHERE `account_id` = ? AND `status` = "verified"',[ account.id ], cb)
            cb()
            // TODO: Email customer telling them they're on hold
          break
          case 'invoice.payment_succeeded':
            this.logger.info('Stripe Invoice Payment Succeeded: '+JSON.stringify(event))
            cb()
          break
          case 'invoice.created':
            this.logger.info('Stripe Invoice Created: '+JSON.stringify(event))
            cb()
          break
          case 'setup_intent.created':
            this.logger.info('Stripe Setup Intent Created: '+JSON.stringify(event))
            cb()
          break
          case 'invoice.finalized':
            this.logger.info('Stripe Invoice Finalized: '+JSON.stringify(event))
            cb()
          break
          default:
            this.logger.warn('Unprocessed Stripe Event: '+event.type+ '('+insertData.id+')')
            insertData.handled='N'
            cb()
        }
      },
      // Write the event to stripe log
      (tr, cb) => { this.schema.get('stripe_event').insert(this.mysql, insertData, cb) }
    ], (err) => {
      if (err) return this.status500End(res)

      res.status(200)
      res.json = { received: true }
      next()
    })
  }
}

/*
Stripe Events:

'account.updated': null,
'account.external_account.created': null,
'account.external_account.deleted': null,
'account.external_account.updated': null,
'balance.available': null,
'billing_portal.configuration.created': null,
'billing_portal.configuration.updated': null,
'billing_portal.session.created': null,
'capability.updated': null,
'cash_balance.funds_available': null,
'charge.captured': null,
'charge.expired': null,
'charge.failed': null,
'charge.pending': null,
'charge.refunded': null,
'charge.succeeded': null,
'charge.updated': null,
'charge.dispute.closed': null,
'charge.dispute.created': null,
'charge.dispute.funds_reinstated': null,
'charge.dispute.funds_withdrawn': null,
'charge.dispute.updated': null,
'charge.refund.updated': null,
'checkout.session.async_payment_failed': null,
'checkout.session.async_payment_succeeded': null,
'checkout.session.completed': null,
'checkout.session.expired': null,
'coupon.created': null,
'coupon.deleted': null,
'coupon.updated': null,
'credit_note.created': null,
'credit_note.updated': null,
'credit_note.voided': null,
'customer.created': null,
'customer.deleted': null,
'customer.updated': null,
'customer.discount.created': null,
'customer.discount.deleted': null,
'customer.discount.updated': null,
'customer.source.created': null,
'customer.source.deleted': null,
'customer.source.expiring': null,
'customer.source.updated': null,
'customer.subscription.created': null,
'customer.subscription.deleted': null,
'customer.subscription.pending_update_applied': null,
'customer.subscription.pending_update_expired': null,
'customer.subscription.trial_will_end': null,
'customer.subscription.updated': null,
'customer.tax_id.created': null,
'customer.tax_id.deleted': null,
'customer.tax_id.updated': null,
'file.created': null,
'identity.verification_session.canceled': null,
'identity.verification_session.created': null,
'identity.verification_session.processing': null,
'identity.verification_session.requires_input': null,
'identity.verification_session.verified': null,
'invoice.created': null,
'invoice.deleted': null,
'invoice.finalization_failed': null,
'invoice.finalized': null,
'invoice.marked_uncollectible': null,
'invoice.paid': null,
'invoice.payment_action_required': null,
'invoice.payment_failed': null,
'invoice.payment_succeeded': null,
'invoice.sent': null,
'invoice.upcoming': null,
'invoice.updated': null,
'invoice.voided': null,
'invoiceitem.created': null,
'invoiceitem.deleted': null,
'invoiceitem.updated': null,
'issuing_authorization.created': null,
'issuing_authorization.updated': null,
'issuing_card.created': null,
'issuing_card.updated': null,
'issuing_cardholder.created': null,
'issuing_cardholder.updated': null,
'issuing_dispute.closed': null,
'issuing_dispute.created': null,
'issuing_dispute.funds_reinstated': null,
'issuing_dispute.submitted': null,
'issuing_dispute.updated': null,
'issuing_transaction.created': null,
'issuing_transaction.updated': null,
'mandate.updated': null,
'order.created': null,
'order.payment_failed': null,
'order.payment_succeeded': null,
'order.updated': null,
'order_return.created': null,
'payment_intent.amount_capturable_updated': null,
'payment_intent.canceled': null,
'payment_intent.created': null,
'payment_intent.partially_funded': null,
'payment_intent.payment_failed': null,
'payment_intent.processing': null,
'payment_intent.requires_action': null,
'payment_intent.succeeded': null,
'payment_link.created': null,
'payment_link.updated': null,
'payment_method.attached': null,
'payment_method.automatically_updated': null,
'payment_method.detached': null,
'payment_method.updated': null,
'payout.canceled': null,
'payout.created': null,
'payout.failed': null,
'payout.paid': null,
'payout.updated': null,
'person.created': null,
'person.deleted': null,
'person.updated': null,
'plan.created': null,
'plan.deleted': null,
'plan.updated': null,
'price.created': null,
'price.deleted': null,
'price.updated': null,
'product.created': null,
'product.deleted': null,
'product.updated': null,
'promotion_code.created': null,
'promotion_code.updated': null,
'quote.accepted': null,
'quote.canceled': null,
'quote.created': null,
'quote.finalized': null,
'radar.early_fraud_warning.created': null,
'radar.early_fraud_warning.updated': null,
'recipient.created': null,
'recipient.deleted': null,
'recipient.updated': null,
'reporting.report_run.failed': null,
'reporting.report_run.succeeded': null,
'review.closed': null,
'review.opened': null,
'setup_intent.canceled': null,
'setup_intent.created': null,
'setup_intent.requires_action': null,
'setup_intent.setup_failed': null,
'setup_intent.succeeded': null,
'sigma.scheduled_query_run.created': null,
'sku.created': null,
'sku.deleted': null,
'sku.updated': null,
'source.canceled': null,
'source.chargeable': null,
'source.failed': null,
'source.mandate_notification': null,
'source.refund_attributes_required': null,
'source.transaction.created': null,
'source.transaction.updated': null,
'subscription_schedule.aborted': null,
'subscription_schedule.canceled': null,
'subscription_schedule.completed': null,
'subscription_schedule.created': null,
'subscription_schedule.expiring': null,
'subscription_schedule.released': null,
'subscription_schedule.updated': null,
'tax_rate.created': null,
'tax_rate.updated': null,
'terminal.reader.action_failed': null,
'terminal.reader.action_succeeded': null,
'test_helpers.test_clock.advancing': null,
'test_helpers.test_clock.created': null,
'test_helpers.test_clock.deleted': null,
'test_helpers.test_clock.internal_failure': null,
'test_helpers.test_clock.ready': null,
'topup.canceled': null,
'topup.created': null,
'topup.failed': null,
'topup.reversed': null,
'topup.succeeded': null,
'transfer.created': null,
'transfer.failed': null,
'transfer.paid': null,
'transfer.reversed': null,
'transfer.updated': null,

*/