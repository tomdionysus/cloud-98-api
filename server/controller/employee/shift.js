const async = require('async')
const _ = require('underscore')
const { getBoundsOfDistance } = require('geolib')

module.exports = {
  // PATCH /v1/employee/shift/{shift_id}
  // Set user_rating on shift
  // Payload { user_rating: int }
  
  patch (req, res, next) {
    const errs = this.validator.validate(req.body, 'shift.rating')
    if (errs.length > 0) { return this.status422End(res, errs) }

    let shift, notification = { id: this.mysql.bigid() }

    this.mysql.asyncTransaction([
      // Check shift exists, this user is the assigned user, the status is 'accepted', and the shift has ended (end_utc < now())
      (tr, cb) => {
        tr.query('SELECT `shift`.*,`premises`.`name` AS `premises_name` FROM `shift`,`premises` WHERE `premises`.`id` = `shift`.`premises_id` AND `shift`.`status` = "accepted" AND `shift`.`user_id` = ? AND `shift`.`id` = ? AND `shift`.`end_utc`<NOW()', [req.session.user.id, req.params.shift_id], (err, results) => {
          if (err) return cb(err)
          if (results.length == 0) return cb({ code: 'NOT_FOUND' })
          shift = results[0]
          cb()
        })
      },
      // Update the shift rating
      (tr, cb) => { tr.query('UPDATE `shift` SET `user_rating` = ? WHERE `id`=?', [req.body.user_rating, req.params.shift_id], cb) },
      // Update shift status if already rated by employer
      (tr, cb) => { tr.query('UPDATE `shift` SET `status` = "completed" WHERE `id`=? AND `status`="accepted" AND `organisation_rating` IS NOT NULL', [req.params.shift_id], cb) },
      // Create Accepted User Notification & Notify Accepted User
      (tr, cb) => {
        notification.id = this.mysql.bigid()
        notification.shift_id = shift.id
        notification.user_id = req.session.user.id
        notification.organisation_id = shift.organisation_id
        notification.action = 'shift_completed'
        notification.title = shift.premises_name+': Shift Completed'
        notification.body = 'Your Shift at '+shift.premises_name+' has been Completed'
        notification.data = {
          notification_id: notification.id,
          shift_id: shift.id,
          job_id: shift.job_id,
          premises_id: shift.premises_id,
        } 
        tr.query('INSERT INTO `notification` (id, user_id, organisation_id, action, status, created_utc, viewed_utc, deleted_utc, data) VALUES (?,?,?,?,"created",NOW(),null,null,?)',[
          notification.id,
          notification.user_id,
          notification.organisation_id,
          notification.action,
          JSON.stringify({...notification.data, title: notification.title, body: notification.body})
        ], cb)
      }, 
      (tr, cb) => {
        this.email.shiftRatedByUser(shift, req.session.user.email, req.body.user_rating, cb)
      },
      (tr, cb) => {
        this.device.notifyAllUserDevices(notification.user_id, notification.title, notification.body, notification.data, cb)
      },
      // Reload Shift
      (tr, cb) => { tr.query('SELECT `shift`.* FROM `shift` WHERE `id`=?', [shift.id], cb) },
      // System Log
      (tr, cb) => {
        this.systemEvent(tr, req.session.user.id, null, 'shift.rated', { shift: { id: req.params.shift_id, user_rating: req.body.user_rating } }, cb)
      }
    ], (err, results) => {
      if (err) {
        switch (err.code) {
          case 'NOT_FOUND':
            return this.status404End(res)
          default:
            return this.status500End(res)
        }
      }

      let shift = results[6] ? results[6][0] : []; if (!_.isArray(shift)) shift = [shift]

      res.status(200)
      res.primaryEntity = 'request'
      res.json = {
        code: 'OK',
        shift: this.presenter.presentArray(shift, 'shift_accepted')
      }
      next()
    })
  }

}
