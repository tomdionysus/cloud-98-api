const async = require('async')
const _ = require('underscore')

module.exports = {

  // GET /v1/employee/request
  // GET /v1/employee/shift/{shift_id}/request

  // Return This user's current requests ( user_id = <current_user>, shift.start_utc > NOW() [,shift.id = {shift_id}] )

  get (req, res, next) {
    let orgids, shiftids, premids, jorequests

    async.series([
      // Get the Requests
      (cb) => {
        const limit = 50

        const sql = 'SELECT `request`.*, `shift`.`shift_type`, `shift`.`premises_id`, `shift`.`currency_id`, `shift`.`organisation_id`, `shift`.`job_id` FROM `request`,`shift` WHERE `shift`.`id` = `request`.`shift_id` AND (`shift`.`start_utc` > NOW() OR `shift_type`="permanent") AND `request`.`user_id` = ? AND `request`.`status` = "placed"'
        const sqlParam = [req.session.user.id, limit]

        // Handle alternative route, shift scope
        if (req.params.shift_id) {
          sql += ' AND `shift`.`id` = ?'
          sqlParam.push(req.params.shift_id)
        }

        this.mysql.query(sql, sqlParam, (err, results) => {
          if (err) return cb(err)

          shiftids = this.mysql.getUniqueIdsFromResultsField(results, 'shift_id')
          orgids = this.mysql.getUniqueIdsFromResultsField(results, 'organisation_id')
          premids = this.mysql.getUniqueIdsFromResultsField(results, 'premises_id')
          currencyids = this.mysql.getUniqueIdsFromResultsField(results, 'currency_id')
          jorequests = this.mysql.getUniqueIdsFromResultsField(results, 'job_id')

          cb(null, results)
        })
      },
      // Load all associated entities
      (rcb) => {
        async.parallel({
          shift: (cb) => { this.mysql.getAllWithIds('shift', shiftids, '*', cb) },
          organisation: (cb) => { this.mysql.getAllWithIds('organisation', orgids, '`id`, `name`', cb) },
          premises: (cb) => { this.mysql.getAllWithIds('premises', premids, '`id`, `name`, `address1`, `address2`, `city`, `region`, `postal_code`, `country_id`, `phone_number`, `lat`, `lng`, `organisation_id`', cb) },
          currency: (cb) => { this.mysql.getAllWithIds('currency', currencyids, '*', cb) },
          job: (cb) => { this.mysql.getAllWithIds('job', jorequests, '`id`, `name`, `industry_id`', cb) },
        }, rcb)
      }
    ], (err, results) => {
      if (err) return this.status500End(res)

      res.status(200)
      res.primaryEntity = 'request'
      res.json = {
        code: 'OK',
        request: this.presenter.presentArray(results[0], 'request'),
        shift: this.presenter.presentArray(results[1].shift[0], 'shift_available'),
        organisation: this.presenter.presentArray(results[1].organisation[0], 'organisation'),
        premises: this.presenter.presentArray(results[1].premises[0], 'premises'),
        currency: this.presenter.presentArray(results[1].currency[0], 'currency'),
        job: this.presenter.presentArray(results[1].job[0], 'job'),
      }
      next()
    })
  },

  // POST /v1/employee/request
  // POST /v1/employee/shift/{shift_id}/request

  // Create a request on a shift

  // Payload {
  //   shift_id: <shift_id>
  //   hourly_rate: <integer>              <- This is an integer of the smallest currency denomination
  //   currency_id: <currrency_id>         <- This is just a check, the request record doesn't have a currency but this must match the shift currrency_id
  // }

  post (req, res, next) {
    // Handle alternative route with shift scope
    if (req.params.shift_id) req.body.shift_id = req.params.shift_id

    // Validate request post
    const errs = this.validator.validate(req.body, 'request.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    // Create a new ID for the request
    const id = this.mysql.bigid()

    var shift, job, premises, organisation, currency, request

    this.mysql.asyncTransaction([
      // Check if user has already requested this shift
      (tr, cb) => {
        tr.query('SELECT COUNT(id) AS requests FROM `request` WHERE `request`.`user_id` = ? AND `request`.`shift_id` = ? AND (`request`.`status`="placed" OR `request`.`status`="accepted")', [req.session.user.id, req.body.shift_id], (err, data) => {
          if (err) return cb(err)
          if (data.length !== 1) return cb(err)
          if (data[0].requests != 0) return cb({ code: 'REQUEST_ALREADY_EXISTS_ON_SHIFT', message: 'The user has already request on the shift', ref: 'shift_id' })
          cb()
        })
      },
      // Check if shift exists, shift has status = 'published', shift organisation is verified, request currency matches shift
      (tr, cb) => {
        tr.query('SELECT `shift`.*, `organisation`.`status` AS org_status, `shift`.`organisation_id` IN (SELECT DISTINCT `organisation_id` FROM `organisation_user` WHERE `user_id` = ?) AS own_org FROM `shift`,`organisation` WHERE `organisation`.`id` = `shift`.`organisation_id` AND `shift`.`id` = ?', [req.session.user.id, req.body.shift_id], (err, data) => {
          if (err) return cb(err)
          if (data.length === 0) return cb({ code: 'SHIFT_DOES_NOT_EXIST', message: 'Cannot find the specified shift', ref: 'shift_id' })
          
          shift = data[0]
          if (shift.status !== 'published') return cb({ code: 'SHIFT_NOT_ACCEPTING_REQUESTS', message: 'The shift has already accepted a request, or has been cancelled', ref: 'shift_id' })
          if (shift.org_status !== 'verified') return cb({ code: 'ORGANISATION_NOT_VALID', message: 'The shift organisation cannot currently accept requests', ref: 'shift_id' })
          if (shift.currency_id !== req.body.currency_id) return cb({ code: 'SHIFT_RATE_CURRENCY_DOES_NOT_MATCH', message: 'The request currency does not match the shift currency', ref: 'currency_id' })
          if (shift.own_org != 0) return cb({ code: 'SHIFT_OWNED_BY_USER_ORGANISATION', message: 'This shift is owned by an organisation you are a member of - you can only create requests on external shifts.', ref: 'shift_id' })
          cb()
        })
      },
      // Check if shift overlaps a current user request
      (tr, cb) => {
        tr.query('SELECT `id`, (SELECT COUNT(*) FROM `request`,`shift` AS `sh2` WHERE `sh2`.`id`=`request`.`shift_id` AND `request`.`user_id` = ? AND (`shift`.`status`="placed" OR `shift`.`status`="accepted") AND `sh2`.`shift_type` <> "permanent" AND NOT(`sh2`.`end_utc` < `shift`.`start_utc` OR `sh2`.`start_utc` > `shift`.`end_utc`)) AS overlaps FROM `shift` WHERE `shift`.`id` = ?', [req.session.user.id, req.body.shift_id], (err, data) => {
          if (err) return cb(err)
          if (data[0].overlaps != 0) return cb({ code: 'SHIFT_OVERLAPS_EXISTING_REQUESTS', message: 'This shift overlaps shifts in your existing requests.', ref: 'shift_id' })
          cb()
        })
      },
      // Check if user has all required qualifications
      (tr, cb) => {
        tr.query("SELECT COUNT(*) AS c FROM `shift_cert_type` WHERE `shift_cert_type`.`shift_id` = ? AND `shift_cert_type`.`required`='Y' AND `shift_cert_type`.`cert_type_id` NOT IN (SELECT `cert_type_id` FROM `cert` WHERE user_id = ? AND status='valid' AND `valid_from_utc` <= ? AND `valid_to_utc` >= ?)", [req.body.shift_id, req.session.user.id, shift.start_utc, shift.end_utc], (err, data) => {
          if (err) return cb(err)
          if (data[0].c != 0) return cb({ code: 'REQUIRED_QUALIFICATIONS_NOT_MET', message: 'You do not have all the required qualifications for this shift, or some of those qualifications are invalid or expire before the shift `start_utc`.', ref: 'shift_id' })
          cb()
        })
      },
      // Create the request
      (tr, cb) => { tr.query('INSERT INTO `request` (`id`, `shift_id`, `user_id`, `hourly_rate`, `status`, `created_utc`) VALUES (?,?,?,?,"placed",NOW())', [id, req.body.shift_id, req.session.user.id, req.body.hourly_rate], cb) },
      // Get Job
      (tr, cb) => {
        async.parallel({
          organisation: (cb) => { this.mysql.getAllWithIds('organisation', [ shift.organisation_id ], '`id`, `name`, `invoicing_email`', cb) },
          premises: (cb) => { this.mysql.getAllWithIds('premises', [ shift.premises_id ], '`id`, `name`, `timezone_id`', cb) },
          job: (cb) => { this.mysql.getAllWithIds('job', [ shift.job_id ], '`id`, `name`', cb) },
          currency: (cb) => { this.mysql.getAllWithIds('currency', [ shift.currency_id ], '`id`, `name`, `decimalplaces`, `symbol`, `seperator`', cb) },
          request: (cb) => { tr.getAllWithIds('request', [ id ], '*', cb) },
        }, (err, res) => {
          if (err) return cb(err)
          organisation = res.organisation[0][0]
          premises = res.premises[0][0]
          job = res.job[0][0]
          currency = res.currency[0][0]
          request = res.request[0][0]
          cb()
        })
      },
      // Send Notification to Employer if permanent
      (tr,cb) => {
        if(shift.shift_type!=='permanent') return cb()
        this.email.notifyEmployerPermanentRequest(organisation, shift, currency, premises, job, req.session.user, cb)

      },
      // Send Notification to Employer if oneoff
      (tr,cb) => {
        if(shift.shift_type!=='oneoff') return cb()
        this.email.notifyEmployerOneOffRequest(organisation, shift, currency, premises, job, req.session.user, cb)
      },
      (tr, cb) => {
        this.email.shiftRequest({ ...shift, premises_name: premises.name }, "placed", req.session.user.email, id, cb)
      },
      // System Log
      (tr, cb) => {
        this.systemEvent(tr, req.session.user.id, null, 'request.created', { request: request }, cb)
      }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'SHIFT_DOES_NOT_EXIST':
            return this.status404End(res, [err])
          case 'SHIFT_RATE_CURRENCY_DOES_NOT_MATCH':
            return this.status422End(res, [err])
          case 'SHIFT_NOT_ACCEPTING_REQUESTS':
          case 'ORGANISATION_NOT_VALID':
          case 'REQUEST_ON_CURRENT_ORGANISATION_SHIFT':
          case 'REQUEST_ALREADY_EXISTS_ON_SHIFT':
          case 'SHIFT_OWNED_BY_USER_ORGANISATION':
          case 'SHIFT_OVERLAPS_EXISTING_REQUESTS':
          case 'REQUIRED_QUALIFICATIONS_NOT_MET':
            return this.status409End(res, [err])
          case 'INTERNAL_SERVER_ERROR':
          default:
            return this.status500End(res)
        }
      }

      res.status(200)
      res.primaryEntity = 'request'
      res.json = {
        code: 'OK',
        request: this.presenter.presentArray(request, 'request')
      }
      next()
    })
  },

  // /v1/employee/request/{request_id}
  // /v1/employee/shift/{shift_id}/request/{request_id}

  delete (req, res, next) {
    this.mysql.asyncTransaction([
      // Check if request exists and is owned by user, and has status='placed'
      (tr, cb) => {
        var sql = 'SELECT `status` FROM `request` WHERE `request`.`id`=? AND `request`.`user_id` = ?'
        var sqlParam = [req.params.request_id, req.session.user.id]

        // Handle alternative route /v1/employee/shift/{shift_id}/request/{request_id}
        if(req.params.shift_id) {
          sql+=' AND `request`.`shift_id` = ?'
          sqlParam.push(req.params.shift_id)
        }

        tr.query(sql, sqlParam, (err, data) => {
          if (err) return cb(err)
          if (data.length === 0) return cb({ code: 'REQUEST_DOES_NOT_EXIST', message: 'Cannot find the specified request', ref: 'request_id' })
          if (data[0].status !== 'placed') return cb({ code: 'REQUEST_STATUS_IS_NOT_PLACED', message: 'The request has already been accepted or rejected, or the request has been previously cancelled', ref: 'request_id' })
          cb()
        })
      },
      // Mark the request cancelled
      (tr, cb) => { tr.query('UPDATE `request` SET `status`="cancelled" WHERE `id`=? AND `user_id`=?', [req.params.request_id, req.session.user.id], cb) },
      // Reload the request
      (tr, cb) => { tr.query('SELECT `request`.* FROM `request` WHERE `id` = ?', [req.params.request_id], cb) }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'REQUEST_DOES_NOT_EXIST':
            return this.status404End(res, [err])
          case 'REQUEST_STATUS_IS_NOT_PLACED':
            return this.status409End(res, [err])
          case 'INTERNAL_SERVER_ERROR':
          default:
            return this.status500End(res)
        }
      }

      let request = results[2][0]; if (!_.isArray(request)) request = [request]

      res.status(200)
      res.primaryEntity = 'request'
      res.json = {
        code: 'OK',
        request: this.presenter.presentArray(request, 'request')
      }
      next()
    })
  }
}
