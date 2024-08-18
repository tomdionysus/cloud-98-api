const async = require('async')
const _ = require('underscore')

module.exports = {
  // GET /v1/employer/shift/current

  // Return Upcoming Shifts (Start > Now()) assigned to this organisation, premises, currency

  get (req, res, next) {
    let orgids, premids, currencyids, jobids, shifts

    async.series([
      (cb) => {
        let sql = 'SELECT `shift`.*, (SELECT COUNT(*) FROM `request` WHERE `request`.`status` <> "cancelled" AND `request`.`shift_id` = `shift`.`id`) AS request_count FROM `shift` WHERE `shift`.`status` NOT IN ("cancelled","completed") AND `shift`.`organisation_id`=?' 
        const sqlparams = [ req.session.organisation.id ]

        if(req.query.shift_type) { sql += ' AND `shift`.`shift_type` = ?'; sqlparams.push(req.query.shift_type) }

        sql += ' ORDER BY `shift`.`start_utc`, `shift`.`id` LIMIT 50'

        this.mysql.query(sql, sqlparams, (err, results) => {
          if (err) return cb(err)

          premids = this.mysql.getUniqueIdsFromResultsField(results, 'premises_id')
          currencyids = this.mysql.getUniqueIdsFromResultsField(results, 'currency_id')
          jobids = this.mysql.getUniqueIdsFromResultsField(results, 'job_id')

          cb(null, results)
        })
      },
      (rcb) => {
        async.parallel([
          (cb) => { this.mysql.getAllWithIds('premises', premids, '`id`, `name`, `address1`, `address2`, `city`, `region`, `postal_code`, `country_id`, `phone_number`, `lat`, `lng`, `organisation_id`, `currency_id`', cb) },
          (cb) => { this.mysql.getAllWithIds('currency', currencyids, '*', cb) },
          (cb) => { this.mysql.getAllWithIds('job', jobids, 'id, name', cb) },
        ], rcb)
      }
    ], (err, results) => {
      if (err) return this.status500End(res)

      let shift = results[0]
      let premises = results[1][0][0]
      let currency = results[1][1][0]
      let job = results[1][2][0]

      res.status(200)
      res.primaryEntity = 'shift'
      res.json = {
        code: 'OK',
        shift: this.presenter.presentArray(shift, 'shift'),
        premises: this.presenter.presentArray(premises, 'premises'),
        currency: this.presenter.presentArray(currency, 'currency'),
        job: this.presenter.presentArray(job, 'job'),
      }
      next()
    })
  }

}
