const async = require('async')
const moment = require('moment')
const _ = require('underscore')

module.exports = {
  // GET /v1/employer/request/{request_id}/estimate

  // Get Estimate for request
  
  get (req, res, next) {
    let data
    async.parallel([
      (cb) => {
        this.mysql.query('SELECT `request`.*, `shift`.`currency_id`, `shift`.`max_rate`,`user`.`first_name`,`user`.`last_name`,`shift`.`start_utc`, `shift`.`end_utc`, `job`.`name` AS job_name FROM `request`,`shift`,`user`,`job` WHERE `job`.`id` = `shift`.`job_id` AND `user`.`id` = `request`.`user_id` AND `shift`.`id` = `request`.`shift_id` AND `request`.`id` = ? AND `shift`.`organisation_id` = ?', [req.params.request_id, req.session.organisation.id], (err, results) => {
          if (err) return cb(err)
          if(results.length===0) return { code: 'REQUEST_NOT_FOUND', description: 'The specified request was not found' }
          data = results[0]
          data.start_utc = moment(data.start_utc)
          data.end_utc = moment(data.end_utc)
          data.hours = Math.round(moment.duration(data.end_utc.diff(data.start_utc)).asMinutes()/60)
          cb(null)
        })
      },
    ], (err, results) => {
      if (err) {
        if(err.code==='REQUEST_NOT_FOUND') { return this.status404End(res, [err]) }
        return this.status500End(res)
      }

      let estimate = this.invoicing.estimate(data.first_name+' '+data.last_name, data.max_rate, data.hours, data.job_name, data.start_utc, data.end_utc)

      res.status(200)
      res.json = {
        code: 'OK',
        request: data,
        estimate: estimate,
      }
      next()
    })
  }
}
