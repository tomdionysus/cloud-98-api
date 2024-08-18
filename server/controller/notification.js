const async = require('async')
const _ = require('underscore')

module.exports = {

  // GET /v1/notification/current
  // GET /v1/notification/{notification_id}

  // Return this user's current notifications

  get (req, res, next) {
    var notifications, jobids = [], requestids = [], shiftids = [], premisesids = []

    async.series([
      // Get the Bids
      (cb) => {
        const limit = 50

        var sql = 'SELECT `notification`.* FROM `notification` WHERE `notification`.`user_id` = ? AND `notification`.`status` <> "deleted"'
        var sqlParam = [req.session.user.id]

        // Handle alternative route, shift scope
        if (req.params.notification_id) {
          sql += ' AND `notification`.`id` = ?'
          sqlParam.push(req.params.notification_id)
        }

        this.mysql.query(sql, sqlParam, (err, data) => {
          if(err) return cb(err)
          notifications = data
          cb()
        })
      },
      // Load all associated entities
      (rcb) => {
        for(var i in notifications) {
          var notification = notifications[i]

          try {
            var info = JSON.parse(notification.data)
            if(info.job_id) jobids.push(info.job_id)
            if(info.request_id) requestids.push(info.request_id)
            if(info.shift_id) shiftids.push(info.shift_id)
            if(info.premises_id) premisesids.push(info.premises_id)
          } catch (e) {
            // So What
          }
        }

        async.parallel({
          job: (cb) => { this.mysql.getAllWithIds('job', jobids, '*', cb) },
          request: (cb) => { this.mysql.getAllWithIds('request', requestids, '*', cb) },
          shift: (cb) => { this.mysql.getAllWithIds('shift', shiftids, '*', cb) },
          premises: (cb) => { this.mysql.getAllWithIds('premises', premisesids, '*', cb) },
        }, rcb)
      },
    ], (err, results) => {
      if (err) return this.status500End(res)

      if (req.params.notification_id && results[0][0].length==0) return this.status404End(res, [{ code: 'NOTIFICATION_DOES_NOT_EXIST', message: 'Cannot find the specified notification', ref: 'notification_id' }])

      res.status(200)
      res.primaryEntity = 'notification'
      res.json = {
        code: 'OK',
        notification: this.presenter.presentArray(notifications, 'notification'),
      }

      if(results[1].job[0].length>0) res.json.job = this.presenter.presentArray(results[1].job[0], 'job')
      if(results[1].request[0].length>0) res.json.request = this.presenter.presentArray(results[1].request[0], 'request')
      if(results[1].shift[0].length>0) res.json.shift = this.presenter.presentArray(results[1].shift[0], 'shift')
      if(results[1].premises[0].length>0) res.json.premises = this.presenter.presentArray(results[1].premises[0], 'premises')
      next()
    })
  },

  // PATCH /v1/notification/{notification_id}

  // Update notification status = viewed.
  patch (req, res, next) {
    // Validate notification patch
    const errs = this.validator.validate(req.body, 'notification.patch')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.mysql.asyncTransaction([
      // Check if notification exists and is status=created
      (tr, cb) => {
        tr.query('SELECT `notification`.`status` FROM `notification` WHERE `notification`.`user_id` = ? AND `notification`.`id` = ?', [req.session.user.id, req.params.notification_id], (err, data) => {
          if (err) return cb(err)
          if (data.length === 0) return cb({ code: 'NOTIFICATION_DOES_NOT_EXIST', message: 'Cannot find the specified notification', ref: 'notification_id' })
          if (data[0].status !== 'created') return cb({ code: 'NOTIFICATION_VIEWED_OR_DELETED', message: 'The notification has already been viewed, or has been deleted', ref: 'notification_id' })
          cb()
        })
      },
      // Update the notification
      (tr, cb) => { tr.query('UPDATE `notification` SET `status`="viewed", `viewed_utc`=NOW() WHERE `notification`.`user_id` = ? AND `notification`.`status`="created" AND `notification`.`id` = ?', [req.session.user.id, req.params.notification_id], cb) },
      // Reload the notification
      (tr, cb) => { tr.query('SELECT `notification`.* FROM `notification` WHERE `notification`.`user_id` = ? AND `notification`.`id` = ?', [req.session.user.id, req.params.notification_id], cb) }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'NOTIFICATION_DOES_NOT_EXIST':
            return this.status404End(res, [err])
          case 'NOTIFICATION_VIEWED_OR_DELETED':
            return this.status409End(res, [err])
          case 'INTERNAL_SERVER_ERROR':
          default:
            return this.status500End(res)
        }
      }

      res.status(200)
      res.primaryEntity = 'notification'
      res.json = {
        code: 'OK',
        notification: this.presenter.presentArray(results[2][0], 'notification')
      }
      next()
    })
  },

  // DELETE /v1/notification/{notification_id}
  // Update notification status = deleted.

  delete (req, res, next) {
    this.mysql.asyncTransaction([
      // Check if notification exists and is status=created
      (tr, cb) => {
        tr.query('SELECT `notification`.`status` FROM `notification` WHERE `notification`.`user_id` = ? AND `notification`.`id` = ?', [req.session.user.id, req.params.notification_id], (err, data) => {
          if (err) return cb(err)
          if (data.length === 0) return cb({ code: 'NOTIFICATION_DOES_NOT_EXIST', message: 'Cannot find the specified notification', ref: 'notification_id' })
          if (data[0].status === 'deleted') return cb({ code: 'NOTIFICATION_ALREADY_DELETED', message: 'The notification is already deleted', ref: 'notification_id' })
          cb()
        })
      },
      // Update the notification
      (tr, cb) => { tr.query('UPDATE `notification` SET `status`="deleted", `deleted_utc`=NOW() WHERE `notification`.`user_id` = ? AND `notification`.`status`<>"deleted" AND `notification`.`id` = ?', [req.session.user.id, req.params.notification_id], cb) },
      // Reload the notification
      (tr, cb) => { tr.query('SELECT `notification`.* FROM `notification` WHERE `notification`.`user_id` = ? AND `notification`.`id` = ?', [req.session.user.id, req.params.notification_id], cb) }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'NOTIFICATION_DOES_NOT_EXIST':
            return this.status404End(res, [err])
          case 'NOTIFICATION_ALREADY_DELETED':
          return this.status409End(res, [err])
          case 'INTERNAL_SERVER_ERROR':
          default:
            return this.status500End(res)
        }
      }

      res.status(200)
      res.primaryEntity = 'notification'
      res.json = {
        code: 'OK',
        notification: this.presenter.presentArray(results[2][0], 'notification')
      }
      next()
    })
  },
}
