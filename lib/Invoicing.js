const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

const moment = require('moment')
const async = require('async')

const Currency = require('./Currency')

class Invoicing {
	constructor ({ logger, mysql }) {
		this.logger = new ScopedLogger('Invoicing', logger || new Logger())
		this.mysql = mysql
	}

	createInvoice(tr, dueBy, organisationId, currencyId, stripePaymentIntentId, accountId, status, callback) {
		var invoiceId = this.mysql.bigid()

		tr.query("INSERT INTO `invoice` (`id`, `created_utc`, `status`, `organisation_id`, `total_amount`, `currency_id`, `stripe_payment_intent_id`, `account_id`, `status`) VALUES (?,NOW(),?,?,?,?,?,?,?)", 
			[ invoiceId, 'created', organisationId, 0, currencyId, stripePaymentIntentId, accountId, status], (err) => {
			if(err) { return callback(err) }
			this.logger.debug('Created Invoice ID '+invoiceId)
			callback(null, invoiceId)
		})
	}


	writeEstimate(tr, invoiceId, estimate, callback) {
		let dorder, total
		async.series([
			(cb) => {
				// Get previous max display order, or zero
				tr.query("SELECT MAX(`display_order`) AS dorder FROM `invoice_item` WHERE `invoice_id` = ?", [ invoiceId ], (err, data) =>{
					if(err) { return cb(err) }
					dorder = data.length>0 ? data[0].dorder : 0
					cb()
				})
			},
			(cb2) => {
				// Write out each line to invoice
				async.forEach(estimate.lines, (item, cb) => {
					tr.query("INSERT INTO `invoice_item` (`id`,`invoice_id`,`description`,`item_type`,`quantity`,`cost`,`total`,`display_order`) VALUES (bigid(),?,?,?,?,?,?,?)", 
						[ invoiceId, item.description, item.item_type, item.quantity, item.cost, item.total, dorder++ ], cb)
				}, cb2)
			},
			(cb) => {
				// Get new Total
				tr.query("SELECT SUM(`total`) AS total FROM `invoice_item` WHERE `invoice_id` = ?", [ invoiceId ], (err, data) =>{
					if(err) { return cb(err) }
					total = data[0].total
					cb()
				})
			},
			(cb) => {
				// Update Invoice total
				tr.query("UPDATE `invoice` SET `total_amount` = ? WHERE `id` = ?", [ total, invoiceId ], cb)
			}
		], callback)
	}

	estimate(name, rate, hours, jobTitle, start, end, currency = Currency.NZD, payrollFee = 600, fee = 0.05, gst = 0.15, annual = 0.08, kiwisaver = 0.03, cardProviderFee = 0.029) {
		let out = { lines: [] }, subtotal

		// Essential Hours
		out.lines.push({ item_type: 'shift', description: name+' - '+jobTitle+' - Hourly', cost: rate, quantity: hours, total: rate*hours })
		out.lines.push({ item_type: 'leave', description: 'Annual Leave ('+Math.round(annual*100)+'%)', cost: Math.round(rate*hours*annual), quantity: 1, total: Math.round(rate*hours*annual) })
		subtotal = this._sum(out.lines)
		out.lines.push({ item_type: 'kiwisaver', description: 'Kiwisaver ('+Math.round(kiwisaver*100)+'%)', cost: Math.round(subtotal*kiwisaver), quantity: 1, total: Math.round(subtotal*kiwisaver) })
		subtotal = this._sum(out.lines)
		out.lines.push({ item_type: 'shift_fee', description: 'cloud98 Fee ('+Math.round(fee*100)+'%)', cost: Math.round(subtotal*fee), quantity: 1, total: Math.round(subtotal*fee) })
		subtotal = this._sum(out.lines)
		out.lines.push({ item_type: 'payroll_fee', description: 'Payroll Fee ('+Currency.format(payrollFee, currency)+')', cost: payrollFee, quantity: 1, total: payrollFee })
		subtotal = this._sum(out.lines)
		out.lines.push({ item_type: 'card_fee', description: 'Card Fee ('+(Math.round(cardProviderFee*1000)/10)+'%)', cost: Math.round(cardProviderFee*subtotal), quantity: 1, total: Math.round(cardProviderFee*subtotal) })
		subtotal = this._sum(out.lines)
		out.gross = subtotal
		out.lines.push({ item_type: 'gst', description: 'GST', cost: Math.round(subtotal*gst), quantity: 1, total: Math.round(subtotal*gst) })
		out.total = this._sum(out.lines)
		out.created_at = moment()
		out.currency = currency

		return out
	}

	_sum(lines) {
		let c=0
		for(var item in lines) c+=lines[item].total
		return Math.round(c) 
	}

	addShift(invoiceId, userId, shiftId, callback) {
		var grossTotal, gstAmount, user, shift

		this.mysql.asyncTransaction([
			(tr,cb) => {
				// Get User
				tr.query("SELECT `first_name`, `last_name` FROM `user` WHERE `id` = ?", [ userId ], (err, data) => {
					if(err) { return cb(err) }
					user = data[0]
					cb()
				})
			},
			(tr,cb) => {
				// Get Shift
				tr.query("SELECT * FROM `shift` WHERE `id` = ? AND `status` = 'completed'", [ shiftId ], (err, data) => {
					if(err) { return cb(err) }
					if(data.length===0) { return cb({ code: 'SHIFT_NOT_FOUND', message: 'Cannot find a completed shift with that ID', ref: 'shift_id' }) }
					shift = data[0]
					// Convert to Moment
					shift.start_utc = moment(shift.start_utc)
					shift.end_utc = moment(shift.end_utc)
					// shift.clock_in_utc = moment(shift.clock_in_utc)
					// shift.clock_out_utc = moment(shift.clock_out_utc)
					cb()
				})
			},
			(tr,cb) => {
				// Drop GST line GST
				tr.query("DELETE FROM `invoice_item` WHERE `invoice_id` = ? AND `item_type` = 'gst'", [ invoiceId ], cb)
			},
			(tr,cb) => {
				// Insert new shift line
				var hours = (moment.duration(shift.end_utc.diff(shift.start_utc)).asMinutes()/60)
				var amount = Math.round(hours*shift.max_rate)
				tr.query("INSERT INTO `invoice_item` (`id`,`invoice_id`,`description`,`item_type`,`user_id`,`shift_id`,`rate`,`hours`,`amount`) VALUES (bigid(),?,?,?,?,?,?,?,?)", [ invoiceId, user.first_name+' '+user.last_name, 'shift', userId, shiftId, shift.max_rate, hours, amount ], cb)
			},
			(tr,cb) => {
				// Get new Total
				tr.query("SELECT SUM(`amount`) AS total FROM `invoice_item` WHERE `invoice_id` = ?", [ invoiceId ], (err, data) =>{
					if(err) { return cb(err) }
					grossTotal = data[0].total
					gstAmount = Math.round(grossTotal*this.gstRate)
					cb()
				})
			},
			(tr,cb) => {
				// Add GST
				tr.query("INSERT INTO `invoice_item` (`id`,`invoice_id`,`description`,`item_type`,`amount`) VALUES (bigid(),?,?,?,?)", [ invoiceId, 'GST (15.0%)', 'gst', gstAmount ], cb)
			},
			(tr,cb) => {
				// Update Invoice total
				tr.query("UPDATE `invoice` SET `total_amount` = ? WHERE `id` = ?", [ grossTotal+gstAmount, invoiceId ], (err, data) =>{
					if(err) { return cb(err) }
					grossTotal = data[0].total
					cb()
				})
			},

		], (err) => {
			if(err) { return callback(err) }
			this.logger.debug('Added Shift ID '+shiftId+' to Invoice '+invoiceId+' (User ID '+userId+')')
			callback()
		})
	}

	sendInvoice(toXeroKey, callback) {
	}
}

module.exports = Invoicing
