#!/usr/local/bin/node

Logger = require('../lib/Logger')
MySQL = require('../lib/MySQL')
Login = require('../lib/Login')

function main () {
  const logger = new Logger()

  const email = process.argv[2]
  if (!email) {
    logger.error('Must supply a user email')
    return
  }
  const first_name = process.argv[3]
  if (!first_name) {
    logger.error('Must supply a user first name')
    return
  }
  const last_name = process.argv[4]
  if (!last_name) {
    logger.error('Must supply a user first name')
    return
  }
  const password = process.argv[5]
  if (!password) {
    logger.error('Must supply a password')
    return
  }

  const mysql = new MySQL({
    logger: logger,
    host: 'localhost',
    user: 'root',
    password: null,
    database: 'cloud98',
    mysqlOptions: { supportBigNumbers: true, bigNumberStrings: true }
  })

  const login = new Login({
    logger: logger,
    mysql: mysql
  })

  mysql.connect()
  logger.info('Creating User %s %s <%s>', [first_name, last_name, email])

// email, firstName, lastName, password, emailConfirmedFlag, accountId, callback
  login.createLogin(email, first_name, last_name, password, 'Y', function (err, user) {
    if (err) {
      logger.error('User creation failed %s', err)
      mysql.end()
      return
    }
    login.checkLogin(email, password, function (err, obj) {
      if (err) {
        logger.error('User check failed %s', err)
        mysql.end()
        return
      }
      logger.info('User creation complete ' + JSON.stringify(obj))
      mysql.end()
    })
  })
}

main()
