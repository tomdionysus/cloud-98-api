const async = require('async')
const _ = require('underscore')

module.exports = {

  // GET /v1/status

  get (req, res, next) {

    async.parallel({
        users: (cb) => { this.mysql.query("SELECT COUNT(*) AS count FROM user", [], cb) },
        organisations: (cb) => { this.mysql.query("SELECT COUNT(*) AS count FROM organisation", [], cb) },
        premises: (cb) => { this.mysql.query("SELECT COUNT(*) AS count FROM premises", [], cb) },
        requests: (cb) => { this.mysql.query("SELECT COUNT(*) AS count FROM shift, request WHERE shift.id = request.shift_id AND shift.status='published'", [], cb) },
        shifts_completed: (cb) => { this.mysql.query("SELECT COUNT(*) AS count FROM shift WHERE status='completed'", [], cb) },
        shifts_published: (cb) => { this.mysql.query("SELECT COUNT(*) AS count FROM shift WHERE start_utc>now() AND status='published'", [], cb) },
        shifts_upcoming: (cb) => { this.mysql.query("SELECT COUNT(*) AS count FROM shift WHERE start_utc>now() AND status='accepted'", [], cb) },
    }, (err, results) => {
      if (err) return this.status500End(res)

      res.status(200)
      res.primaryEntity = ''
      res.json = {
        code: 'OK',
      }

      res.json.users_count = parseInt(results.users[0][0].count)
      res.json.organisations_count = parseInt(results.organisations[0][0].count)
      res.json.premises_count = parseInt(results.premises[0][0].count)
      res.json.requests_count = parseInt(results.requests[0][0].count)
      res.json.shifts_published_count = parseInt(results.shifts_published[0][0].count)
      res.json.shifts_completed_count = parseInt(results.shifts_completed[0][0].count)

      next()
    })
  },
}
