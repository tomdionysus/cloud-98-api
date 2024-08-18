const Login = require('../lib/Login')
const MySqlMock = require('./mocks/MySQLMock')
const LoggerMock = require('./mocks/LoggerMock')

describe('Login', () => {
  let x1, logger, mySqlMock, cb

  beforeEach(() => {
    logger = new LoggerMock()
    mySqlMock = new MySqlMock()
    x1 = new Login({ logger: logger, mysql: mySqlMock })
    cb = { callback: () => {} }
    spyOn(cb, 'callback')
  })

  it('should allow New', () => {
    const x2 = new Login()

    expect(x1).not.toBe(x2)
  })

  describe('createLogin', () => {
    it('should call MySQL with correct queries, email confirmed', () => {
      x1.createLogin('EMAIL', 'FIRST_NAME', 'LAST_NAME', 'PASSWORD', true, cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith(
        'INSERT INTO user (id,first_name,last_name,email,salt,pwdsha256,email_confirmed,email_confirm_code, refresh_token, refresh_token_expiry_utc) VALUES (?,?,?,?,?,?,?,?,?, DATE_ADD(NOW(), INTERVAL 1 WEEK))',
        [jasmine.anyStringBigInt, 'FIRST_NAME', 'LAST_NAME', 'EMAIL', jasmine.anyHash512, jasmine.anyHash256, 'Y', null, jasmine.anyHash256], jasmine.any(Function)
      )
      expect(cb.callback).toHaveBeenCalledWith(null, { id: jasmine.anyStringBigInt, first_name: 'FIRST_NAME', last_name: 'LAST_NAME', email: 'EMAIL', email_confirmed: true, email_confirm_code: null, refresh_token: jasmine.anyHash256 })
      expect(logger.info).toHaveBeenCalledWith('(Login) User [%s] %s Created', jasmine.anyStringBigInt, 'EMAIL')
    })

    it('should call MySQL with correct queries, email unconfirmed', () => {
      x1.createLogin('EMAIL', 'FIRST_NAME', 'LAST_NAME', 'PASSWORD', false, cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith(
        'INSERT INTO user (id,first_name,last_name,email,salt,pwdsha256,email_confirmed,email_confirm_code, refresh_token, refresh_token_expiry_utc) VALUES (?,?,?,?,?,?,?,?,?, DATE_ADD(NOW(), INTERVAL 1 WEEK))',
        [jasmine.anyStringBigInt, 'FIRST_NAME', 'LAST_NAME', 'EMAIL', jasmine.anyHash512, jasmine.anyHash256, 'N', jasmine.anyHash256,  jasmine.anyHash256], jasmine.any(Function)
      )
      expect(cb.callback).toHaveBeenCalledWith(null, { id: jasmine.anyStringBigInt, first_name: 'FIRST_NAME', last_name: 'LAST_NAME', email: 'EMAIL', email_confirmed: false, email_confirm_code: jasmine.anyHash256, refresh_token: jasmine.anyHash256 })
      expect(logger.info).toHaveBeenCalledWith('(Login) User [%s] %s Created', jasmine.anyStringBigInt, 'EMAIL')
    })

    it('should callback error when MySQL fails on user create', () => {
      mySqlMock.returnError = 'ERROR'
      x1.createLogin('EMAIL', 'FIRST_NAME', 'LAST_NAME', 'PASSWORD', false, cb.callback)

      expect(cb.callback).toHaveBeenCalledWith({ message: 'createLogin Failed', error: 'ERROR', ref: 'EMAIL' })
      expect(logger.error).toHaveBeenCalledWith('(Login) Error while creating login %s - %s', 'EMAIL', 'ERROR')
    })
  })

  describe('resetPassword', () => {
    it('should call MySQL with correct queries', () => {
      x1.resetPassword('ID', 'PASSWORD', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith(
        'UPDATE user SET salt = ?, pwdsha256 = ?, password_reset_code = NULL WHERE id = ?',
        [jasmine.anyHash512, jasmine.anyHash256, 'ID'], jasmine.any(Function)
      )

      expect(cb.callback).toHaveBeenCalledWith(null, 'ID')
      expect(logger.info).toHaveBeenCalledWith('(Login) User ID %s Changed Password', 'ID')
    })

    it('should callback error when MySQL fails', () => {
      mySqlMock.returnError = 'ERROR'
      x1.resetPassword('ID', 'PASSWORD', cb.callback)

      expect(cb.callback).toHaveBeenCalledWith('ERROR')
      expect(logger.error).toHaveBeenCalledWith('(Login) Error While changing password for User ID %s', 'ID', 'ERROR')
    })
  })

  describe('getUserByEmail', () => {
    it('should call MySQL with correct queries', () => {
      mySqlMock.returnData = [{ id: 1 }]
      x1.getUserByEmail('EMAIL', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT id, first_name, last_name, email, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token, has_resume FROM user WHERE email = ?', ['EMAIL'], jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, mySqlMock.returnData[0])
    })

    it('should callback error when MySQL fails on account create', () => {
      mySqlMock.returnError = 'ERROR'
      x1.getUserByEmail('EMAIL', cb.callback)

      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })

  describe('checkLogin', () => {
    it('should call MySQL and others with correct params when login is correct', () => {
      mySqlMock.returnData = [{ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL' }]
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.checkLogin('EMAIL', '1234567890', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT id, first_name, last_name, email, salt, pwdsha256, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token, has_resume FROM user WHERE email = ?', ['EMAIL'], jasmine.any(Function))
      expect(mySqlMock.query).toHaveBeenCalledWith('UPDATE user SET last_signin_at = NOW(), refresh_token_expiry_utc = DATE_ADD(NOW(), INTERVAL 1 WEEK) WHERE id = ?', ['USER_ID'], jasmine.any(Function))
      expect(x1.getUserContext).toHaveBeenCalledWith({ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL' }, jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, true, { id: 'USERCONTEXTID' })
      expect(logger.info).toHaveBeenCalledWith('(Login) User [%s] %s Login: Success', 'USER_ID', 'EMAIL')
    })

    it('should call MySQL and others with correct params when login is incorrect', () => {
      mySqlMock.returnData = [{ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL' }]
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.checkLogin('EMAIL', 'BAD_PASSWORD', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT id, first_name, last_name, email, salt, pwdsha256, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token, has_resume FROM user WHERE email = ?', ['EMAIL'], jasmine.any(Function))
      expect(x1.getUserContext).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith(null, false)
      expect(logger.info).toHaveBeenCalledWith('(Login) User [%s] %s Login: Bad Password', 'USER_ID', 'EMAIL')
    })

    it('should fail gracefully on SQL error', () => {
      mySqlMock.returnError = 'ERROR'
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.checkLogin('EMAIL', 'BAD_PASSWORD', cb.callback)

      expect(x1.getUserContext).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith({ message: 'checkLogin SQL Error', error: 'ERROR' }, false)
    })

    it('should fail gracefully on second SQL error', () => {
      mySqlMock.returnData = [{ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL' }]
      mySqlMock.returnError = 'ERROR'
      mySqlMock.errorAfterXCalls = 1
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.checkLogin('EMAIL', '1234567890', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT id, first_name, last_name, email, salt, pwdsha256, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token, has_resume FROM user WHERE email = ?', ['EMAIL'], jasmine.any(Function))
      expect(mySqlMock.query).toHaveBeenCalledWith('UPDATE user SET last_signin_at = NOW(), refresh_token_expiry_utc = DATE_ADD(NOW(), INTERVAL 1 WEEK) WHERE id = ?', ['USER_ID'], jasmine.any(Function))

      expect(x1.getUserContext).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith({ message: '_loginSuccess SQL Error', error: 'ERROR' }, false)
    })

    it('should return false when user not found', () => {
      mySqlMock.returnData = []
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.checkLogin('EMAIL', 'BAD_PASSWORD', cb.callback)

      expect(x1.getUserContext).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith(null, false)
    })

    it('should fail gracefully on getUserContext error', () => {
      mySqlMock.returnData = [{ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL' }]
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn('ERROR') })
      x1.checkLogin('EMAIL', '1234567890', cb.callback)

      expect(cb.callback).toHaveBeenCalledWith({ message: '_loginSuccess getUserContext Error', error: 'ERROR' }, false)
    })
  })

  describe('bypassLogin', () => {
    it('should call MySQL and others with correct params', () => {
      mySqlMock.returnData = [{ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL' }]
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.bypassLogin('EMAIL', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT id, first_name, last_name, email, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token, has_resume FROM user WHERE email = ?', ['EMAIL'], jasmine.any(Function))
      expect(mySqlMock.query).toHaveBeenCalledWith('UPDATE user SET last_signin_at = NOW(), refresh_token_expiry_utc = DATE_ADD(NOW(), INTERVAL 1 WEEK) WHERE id = ?', [ 'USER_ID'], jasmine.any(Function))

      expect(x1.getUserContext).toHaveBeenCalledWith({ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL' }, jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, true, { id: 'USERCONTEXTID' })
      expect(logger.info).toHaveBeenCalledWith('(Login) User [%s] %s Login: Success', 'USER_ID', 'EMAIL')
    })

    it('should fail gracefully on SQL error', () => {
      mySqlMock.returnError = 'ERROR'
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.bypassLogin('EMAIL', cb.callback)

      expect(x1.getUserContext).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith({ message: 'bypassLogin SQL Error', error: 'ERROR' }, false)
    })

    it('should fail gracefully on second SQL error', () => {
      mySqlMock.returnData = [{ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL', refresh_token: 'd178441cf6e7b11424b9b582b398a5975decc3c92bb1ece73a3bf926c96f868de2f089ba0d81d2b23219aac3e0f4e0b1414d9c5e1a8c59bbfea2a606c081b97a' }]
      mySqlMock.returnError = 'ERROR'
      mySqlMock.errorAfterXCalls = 1
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.bypassLogin('EMAIL', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT id, first_name, last_name, email, email_confirmed, email_confirm_code, last_signin_at, image_id, refresh_token, has_resume FROM user WHERE email = ?', ['EMAIL'], jasmine.any(Function))
      expect(mySqlMock.query).toHaveBeenCalledWith('UPDATE user SET last_signin_at = NOW(), refresh_token_expiry_utc = DATE_ADD(NOW(), INTERVAL 1 WEEK) WHERE id = ?', [ 'USER_ID'], jasmine.any(Function))

      expect(x1.getUserContext).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith({ message: '_loginSuccess SQL Error', error: 'ERROR' }, false)
    })

    it('should return false when user not found', () => {
      mySqlMock.returnData = []
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn(null, { id: 'USERCONTEXTID' }) })
      x1.bypassLogin('EMAIL', cb.callback)

      expect(x1.getUserContext).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith(null, false)
    })

    it('should fail gracefully on getUserContext error', () => {
      mySqlMock.returnData = [{ id: 'USER_ID', salt: 'd4fc26035cee2ae4e0fca513c8294b409289dfe9cc40a091a5fdc7070ea1bfbd0406805416ec24a34e5ae3be513614662723fe41f3bf2ba75294554031d5eef6', pwdsha256: 'fb5ad9cff1b5c1fdd47a3f343c64a2b4b21d8e909573b5c6bb53479f82f56674', email: 'EMAIL', refresh_token: 'd178441cf6e7b11424b9b582b398a5975decc3c92bb1ece73a3bf926c96f868de2f089ba0d81d2b23219aac3e0f4e0b1414d9c5e1a8c59bbfea2a606c081b97a' }]
      spyOn(x1, 'getUserContext').and.callFake((user, fn) => { fn('ERROR') })
      x1.bypassLogin('EMAIL', cb.callback)

      expect(cb.callback).toHaveBeenCalledWith({ message: '_loginSuccess getUserContext Error', error: 'ERROR' }, false)
    })
  })

  describe('getPasswordResetCode', () => {
    it('should call MySQL with correct queries', () => {
      mySqlMock.returnData = [{ id: 1 }]
      x1.getPasswordResetCode('EMAIL', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('UPDATE user SET password_reset_code = ? WHERE email = ?', [jasmine.anyHash256, 'EMAIL'], jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, jasmine.anyHash256)
      expect(logger.info).toHaveBeenCalledWith('(Login) User Email %s set password reset code', 'EMAIL')
    })

    it('should callback error when MySQL fails on account create', () => {
      mySqlMock.returnError = 'ERROR'
      x1.getPasswordResetCode('EMAIL', cb.callback)

      expect(cb.callback).toHaveBeenCalledWith('ERROR')
      expect(logger.error).toHaveBeenCalledWith('(Login) Error while setting password reset code for User Email %s - %s', 'EMAIL', 'ERROR')
    })
  })

  describe('getUserWithCode', () => {
    it('should call MySQL with correct queries', () => {
      mySqlMock.returnData = [{ id: 1 }]
      x1.getUserWithCode('CODE', cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT id, first_name, last_name, image_id, email FROM user WHERE password_reset_code = ?', ['CODE'], jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, mySqlMock.returnData[0])
    })

    it('should return not found when database returns no rows', () => {
      mySqlMock.returnData = []
      x1.getUserWithCode('CODE', cb.callback)

      expect(cb.callback).toHaveBeenCalledWith({ code: 'NOT_FOUND', ref: 'CODE' })
    })

    it('should callback error when MySQL fails', () => {
      mySqlMock.returnError = 'ERROR'
      x1.getUserWithCode('CODE', cb.callback)

      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })

  xdescribe('getUserContext', () => {
    let user
    // Note the filthy testing hack. It's *hard* to get mysqlMock to return two different datasets in parallel
    // So I'm munging all the test data into a single response for both queries, e.g. User has no 'roles'
    beforeEach(() => { user = { id: 'ID' } })

    it('should call MySQL with correct queries', () => {
      mySqlMock.returnData = [ user ]

      x1.getUserContext(user, cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT customer.*, customer_user.roles FROM customer, customer_user WHERE customer_user.user_id = ? AND customer.id = customer_user.customer_id', ['ID'], jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(
        null,
        {
          user: { id: 'ID' },
          customers: { id: 'ID' }
        }
      )
    })

    it('should mark an default org correctly', () => {
      mySqlMock.returnData = [
        user
      ]
      x1.getUserContext(user, cb.callback)

      expect(cb.callback).toHaveBeenCalledWith(
        null,
        {
          user: { id: 'ID' },
          customers: { id: 'ID' }
        }
      )
    })

    it('should return error if MySQL fails', () => {
      mySqlMock.returnError = 'ERROR'
      x1.getUserContext(user, cb.callback)

      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT account.* FROM account WHERE id = ?', [undefined], jasmine.any(Function))
      expect(mySqlMock.query).toHaveBeenCalledWith('SELECT organisation.*, organisation_user.roles, organisation_user.isdefault FROM organisation, organisation_user WHERE organisation_user.user_id = ? AND organisation.id = organisation_user.organisation_id', ['ID'], jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })

  describe('resetPasswordWithCode', () => {
    it('should call getUserWithCode and resetPassword correctly', () => {
      spyOn(x1, 'getUserWithCode').and.callFake((code, fn) => { fn(null, { id: 'USER_ID' }) })
      spyOn(x1, 'resetPassword').and.callFake((id, password, fn) => { fn() })

      x1.resetPasswordWithCode('CODE', 'PASSWORD', cb.callback)

      expect(x1.getUserWithCode).toHaveBeenCalledWith('CODE', jasmine.any(Function))
      expect(x1.resetPassword).toHaveBeenCalledWith('USER_ID', 'PASSWORD', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, { id: 'USER_ID' })
    })

    it('should return error if getUserWithCode fails', () => {
      spyOn(x1, 'getUserWithCode').and.callFake((code, fn) => { fn('ERROR') })
      spyOn(x1, 'resetPassword').and.callFake((id, password, fn) => { fn() })

      x1.resetPasswordWithCode('CODE', 'PASSWORD', cb.callback)

      expect(x1.getUserWithCode).toHaveBeenCalledWith('CODE', jasmine.any(Function))
      expect(x1.resetPassword).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })

    it('should return error if resetPassword fails', () => {
      spyOn(x1, 'getUserWithCode').and.callFake((code, fn) => { fn(null, { id: 'USER_ID' }) })
      spyOn(x1, 'resetPassword').and.callFake((id, password, fn) => { fn('ERROR') })

      x1.resetPasswordWithCode('CODE', 'PASSWORD', cb.callback)

      expect(x1.getUserWithCode).toHaveBeenCalledWith('CODE', jasmine.any(Function))
      expect(x1.resetPassword).toHaveBeenCalledWith('USER_ID', 'PASSWORD', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })
})
