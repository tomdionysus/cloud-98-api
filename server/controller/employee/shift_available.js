const async = require('async')
const _ = require('underscore')
const { getBoundsOfDistance } = require('geolib')

module.exports = {
  // GET /v1/employee/shift
  // GET /v1/employee/shift/{shift_id}

  // Return Upcoming Shifts (Start > Now()) and associated organisations, premises, currency

  get (req, res, next) {
    let orgids, premids, currencyids, jobids, industryIds, shifts, bounds

    var validationErr = []
    if(!req.query.lat) { validationErr.push({ code: 'QUERY_LAT_MUST_BE_SPECIFIED', message: 'Query parameter lat must be specified', ref: '?lat'}) } else {
      req.query.lat = Number(req.query.lat)
      if(req.query.lat<-360 || req.query.lat>360) { validationErr.push({ code: 'QUERY_LAT_OUT_OF_RANGE', message: 'Query parameter distance must be within [-360,360]', ref: '?lat'}) }
    }
    if(!req.query.lng) { validationErr.push({ code: 'QUERY_LNG_MUST_BE_SPECIFIED', message: 'Query parameter lng must be specified', ref: '?lng'}) } else {
      req.query.lng = Number(req.query.lng)
      if(req.query.lng<-360 || req.query.lng>360) { validationErr.push({ code: 'QUERY_LNG_OUT_OF_RANGE', message: 'Query parameter distance must be within [-360,360]', ref: '?lng'}) }
    }

    // MOD: This is a temporary 100km static
    req.query.distance = 100
    // END MOD

    if(!req.query.distance) { validationErr.push({ code: 'QUERY_DISTANCE_MUST_BE_SPECIFIED', message: 'Query parameter distance must be specified', ref: '?distance'}) } else {
      req.query.distance = Number(req.query.distance)
      if(req.query.distance<1 || req.query.distance>100) { validationErr.push({ code: 'QUERY_DISTANCE_OUT_OF_RANGE', message: 'Query parameter distance must be within [1, 100]', ref: '?distance'}) }
    }

    if(req.query.lat && req.query.lng && req.query.distance) {
      bounds = getBoundsOfDistance({latitude: req.query.lat, longitude: req.query.lng}, req.query.distance*1000)
    }
    
    if(!bounds || bounds.length!=2) { validationErr.push({ code: 'CANNOT_PROCESS_GEO', message: 'Failure processing geolocation', ref: '?lat,lng,distance'}) }

    if (validationErr.length > 0) return this.status422End(res, validationErr)

    var minlat = Math.min(bounds[0].latitude, bounds[1].latitude)
    var maxlat = Math.max(bounds[0].latitude, bounds[1].latitude)
    var minlng = Math.min(bounds[0].longitude, bounds[1].longitude)
    var maxlng = Math.max(bounds[0].longitude, bounds[1].longitude)

    async.series([
      (cb) => {
        // Base Query, with checks...
        let sql = 'SELECT `shift`.*, `premises`.`organisation_id`, `job`.`industry_id` FROM `shift`, `premises`, `job`,`organisation` WHERE `premises`.`id` = `shift`.`premises_id` AND `job`.`id`=`shift`.`job_id` AND `organisation`.`id` = `premises`.`organisation_id`', sqlparams = []

        // Organisation is verified and not on hold
        sql += ' AND `organisation`.`status` = "verified"'

        // Shift is published and starts in the future, permanent shifts always show
        sql += ' AND `shift`.`status`="published" AND (`shift`.`shift_type` = "permanent" OR `shift`.`start_utc` > NOW())'

        // Shift premises is within the search box
        sql += ' AND `premises`.`lat` > ? AND `premises`.`lat` < ? AND `premises`.`lng` > ? AND `premises`.`lng` < ?'
        sqlparams.push(minlat, maxlat, minlng, maxlng)

        // Shift is not owned by an organisation the user is in (i.e. the user is employed by)
        // sql += ' AND `shift`.`organisation_id` NOT IN (SELECT DISTINCT `organisation_id` FROM `organisation_user` WHERE `user_id` = ?)'
        // sqlparams.push(req.session.user.id)

        // Shift has not already been requested/accepted by this user
        sql += ' AND (SELECT COUNT(`id`) FROM `request` WHERE `shift_id` = `shift`.`id` AND `request`.`user_id`= ? AND (`request`.`status`="placed" OR `request`.`status`="accepted"))=0'
        sqlparams.push(req.session.user.id)

        // Shift does not overlap another request from this user (this includes accepted requests, and therefore accepted shifts) except permanent shifts
        sql += ' AND (`shift`.`shift_type` = "permanent" OR (SELECT COUNT(*) FROM `request`,`shift` AS `sh2` WHERE `sh2`.`id`=`request`.`shift_id` AND `request`.`user_id` = ? AND (`request`.`status`="placed" OR `request`.`status`="accepted") AND `sh2`.`shift_type` <> "permanent" AND NOT(`sh2`.`end_utc` < `shift`.`start_utc` OR `sh2`.`start_utc` > `shift`.`end_utc`))=0)'
        sqlparams.push(req.session.user.id)

        // User has all required Shift qualifications (shift_cert_type)
        sql += " AND ((SELECT COUNT(*) FROM `shift_cert_type` WHERE `shift_cert_type`.`shift_id` = `shift`.`id` AND `shift_cert_type`.`required`='Y' AND `shift_cert_type`.`cert_type_id` NOT IN (SELECT `cert_type_id` FROM `cert` WHERE user_id = ? AND status='valid' AND `valid_from_utc`<=`shift`.`start_utc` AND `valid_to_utc`>=`shift`.`end_utc`))=0)"
        sqlparams.push(req.session.user.id)

        // Order clause
        sql += ' ORDER BY `shift`.`start_utc`, `shift`.`id` LIMIT 50'

        this.mysql.query(sql, sqlparams, (err, results) => {
          if (err) return cb(err)

          orgids = this.mysql.getUniqueIdsFromResultsField(results, 'organisation_id')
          premids = this.mysql.getUniqueIdsFromResultsField(results, 'premises_id')
          currencyids = this.mysql.getUniqueIdsFromResultsField(results, 'currency_id')
          jobids = this.mysql.getUniqueIdsFromResultsField(results, 'job_id')
          industryIds = this.mysql.getUniqueIdsFromResultsField(results, 'industry_id')

          cb(null, results)
        })
      },
      (rcb) => {
        async.parallel([
          (cb) => { this.mysql.getAllWithIds('organisation', orgids, '`id`, `name`', cb) },
          (cb) => { this.mysql.getAllWithIds('premises', premids, '`id`, `name`, `address1`, `address2`, `city`, `region`, `postal_code`, `country_id`, `phone_number`, `lat`, `lng`, `organisation_id`', cb) },
          (cb) => { this.mysql.getAllWithIds('currency', currencyids, '*', cb) },
          (cb) => { this.mysql.getAllWithIds('job', jobids, 'id, name, industry_id', cb) },
          (cb) => { this.mysql.getAllWithIds('industry', industryIds, 'id, name', cb) },
        ], rcb)
      },
      (rcb) => {
        if(req.query.noupdate) return rcb()
        this.mysql.query('UPDATE `user` SET `last_lat`=?, `last_lng`=?, `last_utc`=NOW() WHERE id = ?', [ req.query.lat, req.query.lng, req.session.user.id ], rcb)
      }
    ], (err, results) => {
      if (err) return this.status500End(res)

      let shift = results[0]
      let organisation = results[1][0][0]
      let premises = results[1][1][0]
      let currency = results[1][2][0]
      let job = results[1][3][0]
      let industry = results[1][4][0]

      res.status(200)
      res.primaryEntity = 'shift'
      res.json = {
        code: 'OK',
        shift: this.presenter.presentArray(shift, 'shift_available'),
        organisation: this.presenter.presentArray(organisation, 'organisation'),
        premises: this.presenter.presentArray(premises, 'premises'),
        currency: this.presenter.presentArray(currency, 'currency'),
        job: this.presenter.presentArray(job, 'job'),
        industry: this.presenter.presentArray(industry, 'industry'),
        geo_bounds: {
          minlat: minlat, 
          maxlat: maxlat, 
          minlng: minlng, 
          maxlng: maxlng,
        }
      }
      next()
    })
  }

}
