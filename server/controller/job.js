const async = require('async')
const _ = require('underscore')

module.exports = {
  // GET /v1/job/{id}
  
  get (req, res, next) {
    async.parallel({
        job: (cb) => { this.mysql.query("SELECT * FROM `job` WHERE `id`=?", [req.params.id], cb) },
        industry: (cb) => { this.mysql.query("SELECT `industry`.* FROM `industry`,`job` WHERE `industry`.`id`=`job`.`industry_id` AND `job`.`id`=?", [req.params.id], cb) },
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
