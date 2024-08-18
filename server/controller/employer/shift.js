const async = require('async')
const _ = require('underscore')
const moment = require('moment')
const { getBoundsOfDistance } = require('geolib')

module.exports = {

  // POST /v1/employer/shift
  // POST /v1/employer/premises/{premises_id}/shift

  post (req, res, next) {
    // Handle alterative premises route
    if(req.params.premises_id) { req.body.premises_id = req.params.premises_id }

    // Adding Shift Type breaks some clients. Set Default
    req.body.shift_type = req.body.shift_type ? req.body.shift_type : 'oneoff'

    // Essential Validation
    const errs = this.validator.validate(req.body, 'shift.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    // Create a new ID for the shift
    const id = this.mysql.bigid()

    // For the shift once its created
    var shift, organisation, premises, job

    this.mysql.asyncTransaction([
      // Check organisation state = validated
      (tr, cb) => {
        tr.query('SELECT `status` FROM `organisation` WHERE `id`=?',[req.session.organisation.id], (err, results) => {
          if (err) return cb(err)
          if (results.length === 0) return cb({ code: 'NOT_FOUND' })  
          // if (results[0].status !== 'verified') return cb({ code: 'ORGANISATION_NOT_VERIFIED', message: 'Your organisation cannot currently create shifts as it is not verified, or is on hold' })  
          // TODO: Check if organisation can support the pay_model
          cb()
        })
      },
      // Check premises is owned by organisation
      (tr, cb) => {
        tr.query('SELECT `currency_id` FROM `premises` WHERE `organisation_id` = ? AND `id` = ?',[ req.session.organisation.id, req.body.premises_id], (err, results) => {
          if (err) return cb(err)
          if (results.length === 0) return cb({ code: 'NOT_FOUND' })
          if(!req.body.currency_id) req.body.currency_id = results[0].currency_id
          cb()
        })
      },
      // Check shift currency is valid for organisation exists
      (tr, cb) => {
        tr.query('SELECT COUNT(*) AS c FROM `organisation_currency` WHERE `organisation_currency`.`organisation_id` = ? AND `organisation_currency`.`currency_id` = ?',[req.session.organisation.id, req.body.currency_id], (err, results) => {
          if (err) return cb(err)
          if (results[0].c === 0) return cb({ code: 'SHIFT_CURRENCY_ORGANISATION_NOT_VALID', message: 'Your organisation cannot create shifts with this currency', ref: 'currency_id' })  
          cb()
        })
      },
      // Create Shift
      (tr, cb) => { tr.query('INSERT INTO `shift` (id, start_utc, end_utc, premises_id, organisation_id, status, min_rate, max_rate, currency_id, job_id, pay_model, shift_type, description) VALUES (?,?,?,?,?,"created",?,?,?,?,?,?,?)',[id, moment(req.body.start_utc).utc().format('YYYY/MM/DD HH:mm:ss'), moment(req.body.end_utc).utc().format('YYYY/MM/DD HH:mm:ss'), req.body.premises_id, req.session.organisation.id, req.body.min_rate, req.body.max_rate, req.body.currency_id, req.body.job_id, req.body.pay_model, req.body.shift_type, req.body.description ], cb) },
      // Copy Job certifications to shift
      (tr, cb) => {
        if(!req.body.job_id) return cb()
        tr.query('INSERT INTO `shift_cert_type` (id, shift_id, cert_type_id, required) SELECT (FLOOR(1 + RAND() * POW(2,63))), ?, job_cert_type.cert_type_id, job_cert_type.required FROM `job_cert_type` WHERE job_id=?', [ id, req.body.job_id ], cb) 
      },
      // Reload the shift
      (tr, cb) => { tr.query('SELECT `shift`.*, `premises`.`name` AS premises_name FROM `shift`,`premises` WHERE `shift`.`id` = ? AND `premises`.`id` = `shift`.`premises_id`', [ id ], (err, results) => {
          if (err) return cb(err)
          shift = results[0]
          cb()
        })
      },
      // Email Admin
      (tr, cb) => {
        this.email.shiftUpdated(shift, 'created', req.session.user.email, cb)
      },
      // System Log
      (tr, cb) => {
        this.systemEvent(tr, req.session.user.id, req.session.organisation.id, 'shift.created', { shift: { ...req.body, id: id } }, cb)
      }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'PREMISES_DOES_NOT_EXIST':
            return this.status404End(res, [err])
          case 'SHIFT_CURRENCY_NOT_VALID':
            return this.status422End(res, [err])
          case 'ORGANISATION_NOT_VERIFIED':
          case 'SHIFT_CURRENCY_ORGANISATION_NOT_VALID':
            return this.status409End(res, [err])
          default:
            return this.status500End(res)
        }
      }

      res.status(200)
      res.primaryEntity = 'shift'
      res.json = {
        code: 'OK',
        shift: this.presenter.presentArray([ shift ], 'shift')
      }
      next()
    })
  },

  // PATCH /v1/employer/shift/:shift_id
  // PATCH /v1/employer/premises/{premises_id}/shift/:shift_id
  // Payload {
  //   status:
  //			  'created' - not allowed
  // 				'published' - reset shift to published, reset all bids to placed
  //				'accepted' - not allowed, accept request to change this
  //				'cancelled' - cancel shift, reset all bids to rejected, shift must not have started
  //	 clock_in_utc: datetime or NULL
  //	 clock_out_utc: datetime or NULL
  //	 organisation_rating: tinyint
  // }
  // Update or cancel a shift
  
  patch (req, res, next) {
    const errs = this.validator.validate(req.body, 'shift.patch')
    if (errs.length > 0) { return this.status422End(res, errs) }

    let account, shift, organisation, premises, job, currency

    this.mysql.asyncTransaction([
      // Check shift exists and is owned by the organisation
      (tr, cb) => {
        var sql = 'SELECT `shift`.*, `premises`.`name` AS premises_name, `premises`.`lat` AS premises_lat,`premises`.`lng` AS premises_lng FROM `shift`,`premises` WHERE `shift`.`id` = ? AND `premises`.`id` = `shift`.`premises_id` AND `shift`.`organisation_id` = ?'
        var sqlParams = [req.params.shift_id, req.session.organisation.id ]

        // Handle alterative premises route
        if(req.params.premises_id) {
          sql += ' AND `shift`.`premises_id` = ?'
          sqlParams.push(req.params.premises_id)
        }

        tr.query(sql, sqlParams, (err, results) => {
          if (err) return cb(err)
          if (results.length == 0) return cb({ code: 'NOT_FOUND' })
          shift = results[0]
          cb()
        })
      },
      (tr, cb) => {
        if(!req.body.status) return cb()

        // Check state transition is valid
        // 'created','published','accepted','cancelled','completed','invoiced','paid'
        var stateTransitions = {
          'created': { states: ['published'] },
          'published': { states: ['created','cancelled','accepted'] },
          'accepted': { states: ['cancelled','completed'] },
          'completed': { states: ['invoiced'] },
          'invoiced': { states: ['paid'] },
        }

        var valid = stateTransitions[shift.status]
        if(!valid.states.includes(req.body.status)) return cb({ 
          code: 'SHIFT_STATUS_UNAVAILABLE', 
          message: 'Cannot update this shift status to requested value from current value: '+shift.status+'. Valid statuses are: '+valid.states.join(', ').trim(), 
          ref: 'shift.status' 
        })

        // TODO: Shift cancellation rules
        // TODO: Request modification on cancellation
        // TODO: Reverse payment for cancelled when `status` was 'accepted' and `pay_model` was 'prepay'
        cb()
      },
      // Get the pay model and shift type
      (tr, cb) => {
        if(!req.body.pay_model || req.body.shift_type=="permanent") return cb()

        if(!['created','published'].includes(req.body.status)) return cb({ 
          code: 'SHIFT_PAY_MODEL_UNAVAILABLE', 
          message: 'Cannot update this shift pay_model to requested value when the shift status is not created or published',
          ref: 'shift.pay_model' 
        })

        cb()
      },
      // Get the Account
      (tr, cb) => { 
        tr.query('SELECT `account`.* FROM `account` WHERE `id`=?', [ req.session.organisation.account_id ], (err, results) => {
          if (err) return cb(err)
          account = results[0]
          cb()
        })
      },
      // Check if the organisation is on hold
      (tr, cb) => {
        // Only when not free
        if(account.subscription_type==='free') return cb()
        // Only on Publish
        if(!(req.body.status==='published' && shift.status!=='published')) return cb()
        tr.query('SELECT `organisation`.`status` FROM `organisation` WHERE `id`=?', [ req.session.organisation.id ], (err, results) => {
          if (err) return cb(err)
          if(results[0].status==='hold') return cb({
            code: 'ORGANISATION_ON_HOLD', 
            message: 'Cannot publish this shift because your organisation is on hold due to billing.', 
            ref: 'shift.status' 
          })
          cb()
        })
      },
      // Update fields
      (tr, cb) => {
        var sets = [], params = []
        if(req.body.pay_model) { sets.push('`pay_model` = ?'); params.push(req.body.pay_model) }
        if(req.body.job_id) { sets.push('`job_id` = ?'); params.push(req.body.job_id) }
        if(req.body.currency_id) { sets.push('`currency_id` = ?'); params.push(req.body.currency_id) }
        if(req.body.min_rate!==undefined) { sets.push('`min_rate` = ?'); params.push(req.body.min_rate !== 0 ? req.body.min_rate : null) }
        if(req.body.max_rate) { sets.push('`max_rate` = ?'); params.push(req.body.max_rate) }
        if(req.body.start_utc) { sets.push('`start_utc` = ?'); params.push(moment(req.body.start_utc).utc().format('YYYY/MM/DD HH:mm:ss')) }
        if(req.body.end_utc) { sets.push('`end_utc` = ?'); params.push(moment(req.body.end_utc).utc().format('YYYY/MM/DD HH:mm:ss')) }
        if(req.body.clock_in_utc) { sets.push('`clock_in_utc` = ?'); params.push(moment(req.body.clock_in_utc).utc().format('YYYY/MM/DD HH:mm:ss')) }
        if(req.body.clock_out_utc) { sets.push('`clock_out_utc` = ?'); params.push(moment(req.body.clock_out_utc).utc().format('YYYY/MM/DD HH:mm:ss')) }
        if(req.body.organisation_rating) { sets.push('`organisation_rating` = ?'); params.push(req.body.organisation_rating) }
        if(req.body.description) { sets.push('`description` = ?'); params.push(req.body.description) }

        // If this shift is 'accepted' and both the organisation_rating and user_rating are now set, mark the shift complete
        if(shift.status==='accepted' && ((req.body.organisation_rating && shift.user_rating) || (shift.organisation_rating && shift.user_rating))) {
          req.body.status = 'completed'
        }

        if(req.body.status) { 
          sets.push('`status` = ?'); params.push(req.body.status) 
          sets.push('`'+req.body.status+'_utc` = NOW()');
        }

        if(sets.length===0) return cb()

        params.push(req.params.shift_id, req.session.organisation.id)

        tr.query('UPDATE `shift` SET '+sets.join(', ')+' WHERE `shift`.`id` = ? AND `organisation_id` = ? ', params, cb)
      },
      (tr, cb) => {
        // If job_id has changed, clear and recopy job cert types
        if(!req.body.job_id) return cb()
        async.series([
          (cb2) => { tr.query('DELETE FROM `shift_cert_type` WHERE `shift_id`=?', [ req.params.shift_id ], cb2) },
          (cb2) => { tr.query('INSERT INTO `shift_cert_type` (`id`, `shift_id`, `cert_type_id`, `required`) SELECT (FLOOR(1 + RAND() * POW(2,63))), ?, job_cert_type.cert_type_id, job_cert_type.required FROM `job_cert_type` WHERE `job_id`=?', [ req.params.shift_id, req.body.job_id ], cb2) },
        ], cb)
      },
      // Notify Nearby Users
      (tr, cb) => {
        // Only on Publish
        if(!(req.body.status==='published' && shift.status!=='published')) return cb()

        // Get Bounds
        var bounds = getBoundsOfDistance({latitude: shift.premises_lat, longitude: shift.premises_lng}, 10000)
        var minlat = Math.min(bounds[0].latitude, bounds[1].latitude)
        var maxlat = Math.max(bounds[0].latitude, bounds[1].latitude)
        var minlng = Math.min(bounds[0].longitude, bounds[1].longitude)
        var maxlng = Math.max(bounds[0].longitude, bounds[1].longitude)

        // ASYNC: get all users in range of new job and notify them
        this.mysql.query("SELECT `id`,`email` FROM `user` WHERE last_lat > ? AND last_lat < ? AND last_lng > ? AND last_lng < ?", [ minlat, maxlat, minlng, maxlng ], (err, res) => {
          if(err) return cb(err)

          // Create notification record and notify all devices per user
          async.each(res, (notUsr, cb2) => {
            // Create Job available nearby
            var notificationId = this.mysql.bigid(), notification = {
              id: notificationId,
              user_id: notUsr.id,
              action: 'shifts_available',
              title: shift.premises_name+': New Job Available',
              body: 'A new job at '+shift.premises_name+' is available nearby',
              data: {
                notification_id: notificationId,
                shift_id: shift.id,
                job_id: shift.job_id,
                premises_id: shift.premises_id,
              }
            }
            this.mysql.query('INSERT INTO `notification` (id, user_id, organisation_id, action, status, created_utc, viewed_utc, deleted_utc, data) VALUES (?,?,NULL,?,"created",NOW(),null,null,?)',[
              notification.id,
              notification.user_id,
              notification.action,
              JSON.stringify({...notification.data, title: notification.title, body: notification.body})
            ], (err) => {
              if(err) return cb2(err)
              this.device.notifyAllUserDevices(notUsr.id, notification.title, notification.body, notification.data, cb2)
            })
          }, ()=>{ })
        })
        // END ASYNC
        cb()
      },
      // Report Stripe Usage
      (tr, cb) => {
        // Only when not free
        if(account.subscription_type==='free' || !account.stripe_subscription_item_id) return cb()

        // Report the total number distinct premises with published shifts
        this.mysql.query('SELECT COUNT(DISTINCT `shift`.`premises_id`) AS c FROM `shift`,`organisation` WHERE `shift`.`organisation_id` = ? AND `shift`.`status`="published" and `organisation`.`id`=`shift`.`organisation_id` AND `organisation`.`status` <> "hold"', [ req.session.organisation.id ], (err, results) => {
          if (err) return cb(err)
          this.stripe.reportUsage(account.stripe_subscription_item_id, results[0].c, cb)
        })
      },
      // Reload Shift
      (tr, cb) => { 
        tr.query('SELECT `shift`.*, `premises`.`name` AS premises_name FROM `shift`,`premises` WHERE `shift`.`id` = ? AND `premises`.`id` = `shift`.`premises_id`', [ req.params.shift_id ], (err, results) => {
          if (err) return cb(err)
          shift = results[0]
          cb()
        })
      },
      (tr, cb) => {
        // Skip unless this is a status change
        if(!req.body.status) return cb()
        this.email.shiftUpdated(shift, req.body.status, req.session.user.email, cb)
      },
      // Get Shift Details
      (tr, cb) => {
        if(!['published','cancelled'].includes(shift.status)) return cb()
        async.parallel({
          organisation: (cb) => { this.mysql.getAllWithIds('organisation', [ shift.organisation_id ], '`id`, `name`, `invoicing_email`', cb) },
          premises: (cb) => { this.mysql.getAllWithIds('premises', [ shift.premises_id ], '`id`, `name`, `address1`, `address2`, `city`, `region`, `postal_code`, `country_id`, `timezone_id`', cb) },
          job: (cb) => { this.mysql.getAllWithIds('job', [ shift.job_id ], '`id`, `name`', cb) },
          currency: (cb) => { this.mysql.getAllWithIds('currency', [ shift.currency_id ], '`id`, `name`, `decimalplaces`, `symbol`, `seperator`', cb) },
        }, (err, res) => {
          if (err) return cb(err)
          organisation = res.organisation[0][0]
          premises = res.premises[0][0]
          job = res.job[0][0]
          currency = res.currency[0][0]
          cb()
        })
      },
      // Send Notification to Employer
      (tr,cb) => {
        if(!['published','cancelled'].includes(shift.status)) return cb()
        this.email.notifyEmployerShiftUpdated(organisation, shift, currency, premises, job, req.session.user, cb)
      },
      // System Log
      (tr, cb) => {
        this.systemEvent(tr, req.session.user.id, req.session.organisation.id, 'shift.updated', { shift: { ...req.body, id: req.params.shift_id } }, cb)
      },
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'NOT_FOUND':
            return this.status404End(res)
          case 'SHIFT_STATUS_UNAVAILABLE':
          case 'SHIFT_PAY_MODEL_UNAVAILABLE':
          case 'ORGANISATION_ON_HOLD':
            return this.status409End(res, [err])
          default:
            return this.status500End(res)
        }
      }

      res.status(200)
      res.primaryEntity = 'shift'
      res.json = {
        code: 'OK',
        shift: this.presenter.presentArray([ shift ], 'shift_accepted')
      }
      next()
    })
  },

  // DELETE /v1/employer/shift/:shift_id
  // DELETE /v1/employer/premises/{premises_id}/shift/{shift_id}
  // Delete an unpublished shift
  
  delete (req, res, next) {
    var shift

    this.mysql.asyncTransaction([
      // Check shift exists and is owned by organisation and is status == 'created' OR shift_type == 'permanent'
      (tr, cb) => {
        var sql = 'SELECT `shift`.*, `premises`.`name` AS premises_name FROM `shift`,`premises` WHERE `shift`.`id` = ? AND `premises`.`id` = `shift`.`premises_id` AND `shift`.`organisation_id` = ?'
        var sqlParams = [ req.params.shift_id, req.session.organisation.id ]

        // Handle alterative premises route
        if(req.params.premises_id) {
          sql += ' AND `shift`.`premises_id` = ?'
          sqlParams.push(req.params.premises_id)
        }

        tr.query(sql, sqlParams, (err, results) => {
          if (err) return cb(err)
          if (results.length == 0) return cb({ code: 'NOT_FOUND' })
          shift = results[0]
          if (shift.shift_type != 'permanent' && shift.status != 'created') return cb({ code: 'SHIFT_STATUS_UNAVAILABLE', message: 'This one off shift has already been published. Please use PATCH status=cancelled to cancel the shift.', ref: shift.id })
          cb()
        })
      },
      // Delete shift cert_types
      (tr, cb) => { tr.query('DELETE FROM `shift_cert_type` WHERE `shift_id`=?', [ req.params.shift_id ], cb) },
      // Delete shift
      (tr, cb) => { tr.query('DELETE FROM `shift` WHERE `id`=? AND `organisation_id` = ?', [ req.params.shift_id, req.session.organisation.id ], cb) },
      (tr, cb) => { this.email.shiftUpdated(shift, 'deleted', req.session.user.email, cb) },
      // System Log
      (tr, cb) => {
        this.systemEvent(tr, req.session.user.id, req.session.organisation.id, 'shift.deleted', { shift: { id: req.params.shift_id } }, cb)
      }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'NOT_FOUND':
            return this.status404End(res)
          case 'SHIFT_STATUS_UNAVAILABLE':
            return this.status422End(res, [err])
          default:
            return this.status500End(res)
        }
      }

      res.status(202)
      res.json = {
        code: 'OK',
      }
      next()
    })
  }
}
