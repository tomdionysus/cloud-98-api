const async = require('async')
const _ = require('underscore')

module.exports = {
  // GET /v1/job_all
  get (req, res, next) {
    var sql = "SELECT * FROM `job` WHERE `organisation_id` IS NULL", params = []

    if(req.session.organisation) {
      sql += ' OR `organisation_id` = ?'
      params.push(req.session.organisation.id)
    }

    async.parallel({
        job: (cb) => { this.mysql.query(sql, params, cb) },
        industry: (cb) => { this.mysql.query("SELECT * FROM industry", [], cb) },
    }, (err, results) => {
      if (err) return this.status500End(res)

      res.status(200)
      res.primaryEntity = ''
      res.json = {
        code: 'OK',
        job: this.presenter.presentArray(results.job[0], 'job'),
        industry: this.presenter.presentArray(results.industry[0], 'industry'),
      }

      next()
    })
  },
}
