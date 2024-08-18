const async = require('async')
const _ = require('underscore')
const moment = require('moment')
const Currency = require('../../../lib/Currency')

module.exports = {
  // GET /v1/employer/request
  // GET /v1/employer/shift/{shift_id}/request

  // Get All (open, future) shift requests
  // (Shift must be status=published and start_utc>now(), Request must be status=placec)
  
  get (req, res, next) {
    let premids, shiftids, userids, currencyids, jobids
    async.series([
      (cb) => {
        const limit = 50

        var sql = 'SELECT `request`.*, `shift`.`premises_id`, `shift`.`status` AS `shift_status`, `shift`.`currency_id`, `shift`.`job_id`, (SELECT AVG(`organisation_rating`) FROM `shift` WHERE `shift`.`user_id` = `request`.`user_id` AND `shift`.`status`="completed" ORDER BY `end_utc` DESC LIMIT 5) AS `user_rating`, (SELECT MAX(`years_experience`) FROM `experience` WHERE `experience`.`job_id`=`shift`.`job_id` AND `experience`.`user_id`=`request`.`user_id`) AS `job_years_experience`, (SELECT MAX(`experience`.`years_experience`) FROM `experience`,`job`,`job` AS `job2` WHERE `job`.`id`=`shift`.`job_id` AND `job2`.`industry_id`=`job`.`industry_id` AND `experience`.`user_id`=`request`.`user_id` AND `experience`.`job_id`=`job2`.`id`) AS `industry_years_experience` FROM `request`,`shift` WHERE `request`.`status` <> "cancelled" AND `shift`.`id` = `request`.`shift_id` AND `shift`.`organisation_id` = ?'
        var sqlParam = [req.session.organisation.id]

        // Handle alternative route, shift scope
        if (req.params.shift_id) {
          sql += ' AND `shift`.`id` = ?'
          sqlParam.push(req.params.shift_id)
        }

        sql += ' ORDER BY `shift`.`start_utc`'

        this.mysql.query(sql, sqlParam, (err, results) => {
          if (err) return cb(err)

          premids = this.mysql.getUniqueIdsFromResultsField(results, 'premises_id')
          shiftids = this.mysql.getUniqueIdsFromResultsField(results, 'shift_id')
          userids = this.mysql.getUniqueIdsFromResultsField(results, 'user_id')
          currencyids = this.mysql.getUniqueIdsFromResultsField(results, 'currency_id')
          jobids = this.mysql.getUniqueIdsFromResultsField(results, 'job_id')

          cb(null, results)
        })
      },
      (rcb) => {
        async.parallel([
          (cb) => { this.mysql.getAllWithIds('premises', premids, 'id, name', cb) },
          (cb) => { this.mysql.getAllWithIds('shift', shiftids, '*', cb) },
          (cb) => { this.mysql.getAllWithIds('user', userids, 'id, image_id, first_name, last_name, email, has_resume', cb) },
          (cb) => { this.mysql.getAllWithIds('currency', currencyids, '*', cb) },
          (cb) => { this.mysql.getAllWithIds('job', jobids, 'id, name', cb) },
        ], rcb)
      }
    ], (err, results) => {
      if (err) return this.status500End(res)

      let request = results[0]
      let premises = results[1][0][0]
      let shift = results[1][1][0] 
      let user = results[1][2][0]
      let currency = results[1][3][0] 
      let job = results[1][4][0]

      res.status(200)
      res.primaryEntity = 'request'
      res.json = {
        code: 'OK',

        request: this.presenter.presentArray(request, 'request'),
        premises: this.presenter.presentArray(premises, 'premises'),
        shift: this.presenter.presentArray(shift, 'shift'),
        user: this.presenter.presentArray(user, 'user'),
        currency: this.presenter.presentArray(currency, 'currency'),
        job: this.presenter.presentArray(job, 'job'),
      }
      next()
    })
  },

  // PATCH /v1/employer/request/:request_id
  // Payload { status: 'placed' | 'accepted' | 'rejected' }

  // Accept or reject a request
  patch (req, res, next) {
    const errs = this.validator.validate(req.body, 'request.acceptreject')
    if (errs.length > 0) { return this.status422End(res, errs) }

    let shift, notification = { id: this.mysql.bigid() }, request

    this.mysql.asyncTransaction([
      // Check request exists, and is state=placed
      (tr, cb) => {
        tr.query('SELECT `shift`.*, `request`.`user_id` AS `requesting_user_id`, `request`.`status` AS `request_status`, `premises`.`name` AS `premises_name`, `job`.`name` AS `job_name`, `user`.`first_name`, `user`.`last_name` FROM `request`,`shift`,`premises`,`job`,`user` WHERE `user`.`id` = `request`.`user_id` AND `job`.`id` = `shift`.`job_id` AND `shift`.`id` = `request`.`shift_id` AND `premises`.`id` = `shift`.`premises_id` AND `request`.`id` = ? AND `shift`.`organisation_id` = ?', [ req.params.request_id, req.session.organisation.id ], (err, results) => {
          if (err) return cb(err)
          if (results.length === 0) return cb({ code: 'NOT_FOUND' })
          shift = results[0]
          shift.start_utc = moment(shift.start_utc)
          shift.end_utc = moment(shift.end_utc)
          shift.hours = Math.round(moment.duration(shift.end_utc.diff(shift.start_utc)).asMinutes()/60)
          if (shift.request_status != 'placed') return cb({ code: 'REQUEST_BAD_STATUS', message: 'The request has already been accepted or rejected', ref: req.params.request_id })
          if (shift.status != 'published') return cb({ code: 'SHIFT_STATUS_INCORRECT', message: 'The shift is cancelled, not published, or has already accepted a request', ref: shift.id })
          cb()
        })
      },
      // Update this Request
      (tr, cb) => { tr.query('UPDATE `request` SET `status`=? WHERE `id`=?', [req.body.status, req.params.request_id], cb) },
      // Reject All other requests
      (tr, cb2) => {
        // If not accept, skip these steps
        if (req.body.status != 'accepted') return cb2()

        var estimate, organisation, invoiceId, tokenId, charge, currency, accountId

        invoiceId = this.mysql.bigid()

        async.series([
          (cb) => {
            tr.query('UPDATE `request` SET `status` = "rejected" WHERE `id`<>? AND `shift_id`=?', [req.params.request_id, shift.id], cb)
          },
          // Get Estimate
          (cb) => {
            if(shift.pay_model==='employer') return cb() // Not if employer pays
            estimate = this.invoicing.estimate(shift.first_name+' '+shift.last_name, shift.max_rate, shift.hours, shift.job_name, shift.start_utc, shift.end_utc)
            cb()
          },
          // Get Payment Method
          (cb) => {
            if(shift.pay_model==='employer') return cb() // Not if employer pays
            tr.query('SELECT `token_identifier`, `payment_method`.`account_id` FROM `payment_method`,`organisation` WHERE `payment_method`.`id` = ? AND `payment_method`.`account_id` = `organisation`.`account_id` AND `organisation`.`id` = ?', [ req.body.payment_method_id, req.session.organisation.id ], (err, data) => {
              if(err) { return cb(err) }
              if(data.length===0) { return cb({ code: 'PAYMENT_METHOD_NOT_FOUND', description: 'The specified payment method was not found' }) }
              tokenId = data[0].token_identifier
              accountId = data[0].account_id
              cb()
            })
          },
          // Get Currency
          (cb) => {
            if(shift.pay_model==='employer') return cb() // Not if employer pays
            tr.query('SELECT * FROM `currency` WHERE`id` = ?', [ shift.currency_id ], (err, data) => {
              if(err) { return cb(err) }
              if(data.length===0) { return cb({ code: 'CURRENCY_NOT_FOUND', description: 'The currency specified in the shift was not found' }) }
              currency = data[0]
              cb()
            })
          },
          // Get Organisation Settings
          (cb) => {
             tr.query('SELECT * FROM `organisation` WHERE`id` = ?', [ shift.organisation_id ], (err, data) => {
              if(err) { return cb(err) }
              if(data.length===0) { return cb({ code: 'ORGANISATION_NOT_FOUND', description: 'The organisation that owns the shift was not found' }) } // This should never happen
              organisation = data[0]
              cb()
            })
          },
          // Charge Credit Card
          (cb) => {
            if(shift.pay_model==='employer') return cb() // Not if employer pays
            if(organisation.billing!=='card') return cb() // Only if billing type is card
            this.stripe.charge(estimate.total, currency, tokenId, req.session.account.stripe_customer_id, 'cloud98 By cloud98- Invoice '+invoiceId, (err, data) => {
              if(err) { return cb({ code: 'STRIPE_ERROR', description: 'The Payment failed', data: err }) }
              charge = data
              cb()
            })
          },
          // Create Invoice
          (cb) => {
            if(shift.pay_model==='employer') return cb() // Not if employer pays
            this.invoicing.createInvoice(tr, moment(), shift.organisation_id, shift.currency_id, charge?.id, accountId,(organisation.billing !== 'card' ? 'sent' : 'completed'), (err, data) => {
              if(err) { return cb(err) }
              invoiceId = data
              cb()
            })
          },
          // Write out Estimate to invoice
          (cb) => {
            if(shift.pay_model==='employer') return cb() // Not if employer pays
            this.invoicing.writeEstimate(tr, invoiceId, estimate, cb)
          },
          // Update shift
          (cb) => {
            tr.query('UPDATE `shift` SET `accepted_request_id` = ?, status="accepted", `user_id` = ?, `invoice_id` = ? WHERE `id`=?', [req.params.request_id, shift.requesting_user_id, invoiceId, shift.id ], cb)
          },
          // Create Accepted User Notification & Notify Accepted User
          (cb) => {
            notification.id = this.mysql.bigid()
            notification.user_id = shift.requesting_user_id
            notification.organisation_id = req.session.organisation.id
            notification.action = 'request_accepted'
            notification.title = shift.premises_name+': Shift Request Accepted'
            notification.body = 'Your Shift Request at '+shift.premises_name+' has been Accepted'
            notification.data = {
              notification_id: notification.id,
              request_id: req.params.request_id,
              shift_id: shift.id,
              job_id: shift.job_id,
              premises_id: shift.premises_id,
            } 
            tr.query('INSERT INTO `notification` (id, user_id, organisation_id, action, status, created_utc, viewed_utc, deleted_utc, data) VALUES (?,?,?,?,"created",NOW(),null,null,?)',[
              notification.id,
              notification.user_id,
              notification.organisation_id,
              notification.action,
              JSON.stringify({...notification.data, title: notification.title, body: notification.body})
            ], cb)
          }, 
          (cb) => {
            this.device.notifyAllUserDevices(shift.requesting_user_id, notification.title, notification.body, notification.data, cb)
          },
        ], cb2)
      },
      (tr, cb) => {
        this.email.shiftRequest(shift, req.body.status, req.session.user.email, req.params.request_id, cb)
      },
      // Reload Request
      (tr, cb) => { 
        tr.query('SELECT `request`.* FROM `request` WHERE `id`=?', [req.params.request_id], (err, res)=>{
        if(err) return cb(err)
        request = res[0]; cb()
      })},
      // Reload Shift
      (tr, cb) => { tr.query('SELECT `shift`.* FROM `shift` WHERE `id`=?', [shift.id], (err, res)=>{
        if(err) return cb(err)
        shift = res[0]; cb()
      })},
      // System Log
      (tr, cb) => {
        this.systemEvent(tr, req.session.user.id, req.session.organisation.id, 'request.updated', { request: { ...req.body, id: req.params.request_id } }, cb)
      }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'NOT_FOUND':
          case 'PAYMENT_METHOD_NOT_FOUND':
            return this.status404End(res)
          case 'REQUEST_BAD_STATUS':
          case 'SHIFT_STATUS_UNAVAILABLE':
            return this.status422End(res, [err])
          case 'STRIPE_ERROR':
            return this.status402End(res, this.stripe.getAPIErrorsFrom(err.data))
          default:
            return this.status500End(res)
        }
      }

      res.status(200)
      res.primaryEntity = 'request'
      res.json = {
        code: 'OK',
        request: this.presenter.presentArray([request], 'request'),
        shift: this.presenter.presentArray([shift], 'shift_accepted')
      }
      next()
    })
  }
}
