const crypto = require('crypto')
const async = require('async')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

class Login {
  constructor (options) {
    options = options || {}
    this.options = options
    this.logger = new ScopedLogger('Login', options.logger || new Logger())
    this.mysql = options.mysql
  }

  createLogin (email, firstName, lastName, password, emailConfirmedFlag, callback) {
    const id = this.mysql.bigid()
    const salt = crypto.randomBytes(64).toString('hex')
    const refreshToken = crypto.randomBytes(64).toString('hex')
    const pwdsha256 = crypto.createHash('sha256').update(salt).update(password).digest().toString('hex')
    let emailConfirmed; let email_confirm_code = null
    if (emailConfirmedFlag) {
      emailConfirmed = 'Y'
    } else {
      emailConfirmed = 'N'
      email_confirm_code = crypto.randomBytes(16).toString('hex')
    }

    async.series([
      (cb) => {
        // TODO remove the password reset code and make a default in schema
        this.mysql.query('INSERT INTO user (id,first_name,last_name,email,salt,pwdsha256,email_confirmed,email_confirm_code, refresh_token, refresh_token_expiry_utc) VALUES (?,?,?,?,?,?,?,?,?, DATE_ADD(NOW(), INTERVAL 1 WEEK))', [id, firstName, lastName, email, salt, pwdsha256, emailConfirmed, email_confirm_code, refreshToken], (err) => {
          if (err) return cb(err)
          this.logger.info('User [%s] %s Created', id, email)
          cb(null, { id: id, first_name: firstName, last_name: lastName, email: email, email_confirmed: emailConfirmedFlag, email_confirm_code: email_confirm_code, refresh_token: refreshToken })
        })
      }
    ], (err, results) => {
      if (err) {
        this.logger.error('Error while creating login %s - %s', email, err)
        return callback({ message: 'createLogin Failed', error: err, ref: email })
      }
      callback(err, results[0])
    })
  }

  resetPassword (id, password, callback) {
    const salt = crypto.randomBytes(64).toString('hex')
    const pwdsha256 = crypto.createHash('sha256').update(salt).update(password).digest().toString('hex')

    this.mysql.query('UPDATE user SET salt = ?, pwdsha256 = ?, password_reset_code = NULL WHERE id = ?', [salt, pwdsha256, id], (err) => {
      if (err) {
        this.logger.error('Error While changing password for User ID %s', id, err)
        callback(err)
        return
      }
      this.logger.info('User ID %s Changed Password', id)
      callback(null, id)
    })
  }

  getUserByEmail (email, callback) {
    this.mysql.query('SELECT id, first_name, last_name, email, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token FROM user WHERE email = ?', [email], (err, results) => {
      if (err) { callback(err); return }
      callback(null, results[0])
    })
  }

  _loginSuccess(userData, callback) {
    this.logger.info('User [%s] %s Login: Success', userData.id, userData.email)
    this.mysql.query('UPDATE user SET last_signin_at = NOW(), refresh_token_expiry_utc = DATE_ADD(NOW(), INTERVAL 1 WEEK) WHERE id = ?', [ userData.id ], (err) => {
      if (err) { return callback({ message: '_loginSuccess SQL Error', error: err }, false) }
      this.getUserContext(userData, (err, usercontext) => {
        if (err) { return callback({ message: '_loginSuccess getUserContext Error', error: err }, false) }
        callback(null, true, usercontext)
      })
    })
  }

  verifyPassword(id, password, callback) {
    this.mysql.query('SELECT salt, pwdsha256 FROM user WHERE id = ?', [id], (err, results) => {
      if (err) { return callback({ message: 'verifyPassword SQL Error', error: err }, false) }
      if (results.length === 0) { return callback(null, false) }

      const hash = crypto.createHash('sha256').update(results[0].salt).update(password.toString())
      callback(null, (hash.digest().toString('hex') === results[0].pwdsha256))
    })
  }

  checkLogin (email, password = '', callback) {
    this.mysql.query('SELECT id, first_name, last_name, email, salt, pwdsha256, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token FROM user WHERE email = ?', [ email.trim() ], (err, results) => {
      if (err) { return callback({ message: 'checkLogin SQL Error', error: err }, false) }
      if (results.length === 0) { return callback(null, false) }

      const hash = crypto.createHash('sha256').update(results[0].salt).update(password.toString())
      if (hash.digest().toString('hex') === results[0].pwdsha256) {
        this._loginSuccess(results[0], callback)
      } else {
        this.logger.info('User [%s] %s Login: Bad Password', results[0].id, results[0].email)
        callback(null, false)
      }
    })
  }

  checkLoginRefreshToken(refreshToken, callback) {
    this.mysql.query('SELECT id, first_name, last_name, email, salt, pwdsha256, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token FROM user WHERE refresh_token = ? AND refresh_token_expiry_utc>NOW() ', [refreshToken], (err, results) => {
      if (err) { return callback({ message: 'checkLoginRefreshToken SQL Error', error: err }, false) }
      if (results.length === 0) { 
        this.logger.info('Login with Refresh Token: Bad Token %s', refreshToken)
        callback(null, false)
      } else {
        this._loginSuccess(results[0], callback)
      }
    })
  }

  bypassLogin (email, callback) {
    this.mysql.query('SELECT id, first_name, last_name, email, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token FROM user WHERE email = ?', [email], (err, results) => {
      if (err) { return callback({ message: 'bypassLogin SQL Error', error: err }, false) }
      if (results.length === 0) { return callback(null, false) }
      this._loginSuccess(results[0], callback)
    })
  }

  getUserContext (user, callback) {
    var usercontext = { user: user }
    this.mysql.query('SELECT organisation.*, organisation_user.roles, organisation_user.isdefault FROM organisation, organisation_user WHERE organisation_user.user_id = ? AND organisation.id = organisation_user.organisation_id', [user.id], (err, results) => {
      if (err) return callback(err)
      usercontext.organisations = results
      // Get Default organisation if defined
      for (let i = 0; i < usercontext.organisations.length; i++) {
        const orgroles = usercontext.organisations[i].roles.split(',')
        usercontext.organisations[i].roles = {}
        for (const role in orgroles) { usercontext.organisations[i].roles[orgroles[role]] = true }
        if (usercontext.organisations[i].isdefault === 'Y') { usercontext.organisation = usercontext.organisations[i] }
      }

      callback(null, usercontext)
    })
  }

  getPasswordResetCode (email, callback) {
    const code = crypto.randomBytes(16).toString('hex')

    this.mysql.query('UPDATE user SET password_reset_code = ? WHERE email = ?', [code, email], (err) => {
      if (err) {
        this.logger.error('Error while setting password reset code for User Email %s - %s', email, err)
        callback(err)
        return
      }
      this.logger.info('User Email %s set password reset code', email)
      callback(null, code)
    })
  }

  getUserWithCode (code, callback) {
    this.mysql.query('SELECT id, first_name, last_name, image_id, email FROM user WHERE password_reset_code = ?', [code], (err, results) => {
      if (err) return callback(err)
      if (results.length === 0) { return callback({ code: 'NOT_FOUND', ref: code }) }
      callback(null, results[0])
    })
  }

  resetPasswordWithCode (code, password, callback) {
    let user
    async.series([
      (cb) => {
        this.getUserWithCode(code, (err, data) => {
          if (err) return cb(err)
          user = data
          cb()
        })
      },
      (cb) => { this.resetPassword(user.id, password, cb) }
    ], (err) => {
      if (err) return callback(err)
      callback(null, user)
    })
  }
}

module.exports = Login
