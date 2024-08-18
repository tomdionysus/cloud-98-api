const async = require('async')
const _ = require('underscore')

module.exports = {
  // GET /v1/employee/payroll
  // Return current user payroll information

  get (req, res, next) {
    this.mysql.query('SELECT `legal_name`, `bank_account`, `tax_code`, `ird_number`, `kiwisaver_percent` FROM `user` WHERE `id`=?' , [ req.session.user.id ], (err, results) => {
      if (err) return this.status500End(res)
      if (results.length === 0) return this.status404End(res) // Should never happen

      res.status(200)
      res.primaryEntity = 'payroll'
      res.json = {
        code: 'OK',
        payroll: this.presenter.presentArray(results, 'payroll')
      }
      next()
    })
  },

  // PATCH /v1/employee/payroll
  // Update current user payroll information

  patch (req, res, next) {
    const errs = this.validator.validate(req.body, 'payroll.patch')
    if (errs.length > 0) { return this.status422End(res, errs) }

    var params = []
    var sets = []

    if(req.body.legal_name) { sets.push('`legal_name`=?'); params.push(req.body.legal_name) }
    if(req.body.bank_account) { sets.push('`bank_account`=?'); params.push(req.body.bank_account) }
    if(req.body.tax_code) { sets.push('`tax_code`=?'); params.push(req.body.tax_code) }
    if(req.body.ird_number) { sets.push('`ird_number`=?'); params.push(req.body.ird_number) }
    if(req.body.kiwisaver_percent) { sets.push('`kiwisaver_percent`=?'); params.push(req.body.kiwisaver_percent) }

    if(sets.length===0) { return this.status422End(res, [{ code:'NO_FIELDS', description:'No data supplied for update.'}]) }

    params.push(req.session.user.id) 

    this.mysql.query('UPDATE `user` SET '+sets.join(',')+' WHERE `id`=?' , params, (err, results) => {
      if (err) return this.status500End(res)

      res.status(200)
      res.primaryEntity = 'payroll'
      res.json = {
        code: 'OK',
        payroll: this.presenter.presentArray([req.body], 'payroll')
      }
      next()
    })
  }

}
