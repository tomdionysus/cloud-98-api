const async = require('async')
const _ = require('underscore')
const { getBoundsOfDistance } = require('geolib')

module.exports = {
  // GET /v1/admin/shift/current

  // Return All Shifts (Start > Now()) assigned to this user and associated organisations, premises, currency

  get (req, res, next) {
    let orgids, premids, currencyids, jobids, shifts

    async.series([
      (cb) => {
        let sql = 'SELECT `shift`.*, (SELECT COUNT(*) FROM `request` WHERE `request`.`shift_id` = `shift`.`id` AND `request`.`status`<>"cancelled") AS `request_count`, `premises`.`organisation_id` FROM `shift`, `premises` WHERE `premises`.`id` = `shift`.`premises_id` AND `start_utc` > NOW()' 
        const sqlparams = [ req.session.user.id ]

        sql += ' ORDER BY `shift`.`start_utc`, `shift`.`id` LIMIT 50'

        this.mysql.query(sql, sqlparams, (err, results) => {
          if (err) return cb(err)

          orgids = this.mysql.getUniqueIdsFromResultsField(results, 'organisation_id')
          premids = this.mysql.getUniqueIdsFromResultsField(results, 'premises_id')
          currencyids = this.mysql.getUniqueIdsFromResultsField(results, 'currency_id')
          jobids = this.mysql.getUniqueIdsFromResultsField(results, 'job_id')

          cb(null, results)
        })
      },
      (rcb) => {
        async.parallel([
          (cb) => { this.mysql.getAllWithIds('organisation', orgids, '`id`, `name`', cb) },
          (cb) => { this.mysql.getAllWithIds('premises', premids, '`id`, `name`, `address1`, `address2`, `city`, `region`, `postal_code`, `country_id`, `phone_number`, `lat`, `lng`, `organisation_id`', cb) },
          (cb) => { this.mysql.getAllWithIds('currency', currencyids, '*', cb) },
          (cb) => { this.mysql.getAllWithIds('job', jobids, 'id, name', cb) },
        ], rcb)
      }
    ], (err, results) => {
      if (err) return this.status500End(res)

      let shift = results[0]
      let organisation = results[1][0][0]
      let premises = results[1][1][0]
      let currency = results[1][2][0]
      let job = results[1][3][0]

      res.status(200)
      res.primaryEntity = 'shift'
      res.json = {
        code: 'OK',
        shift: this.presenter.presentArray(shift, 'shift'),
        organisation: this.presenter.presentArray(organisation, 'organisation'),
        premises: this.presenter.presentArray(premises, 'premises'),
        currency: this.presenter.presentArray(currency, 'currency'),
        job: this.presenter.presentArray(job, 'job'),
      }
      next()
    })
  }

}
