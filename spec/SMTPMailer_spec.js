const LoggerMock = require('./mocks/LoggerMock')
const SMTPMailer = require('../lib/SMTPMailer')

describe('SMTPMailer', () => {
  it('should allow New', () => {
    const x1 = new SMTPMailer()
    const x2 = new SMTPMailer()

    expect(x1).not.toBe(x2)
  })

  describe('connect', () => {
    it('should call createTransport with defaults', () => {
      const mailer = {
        createTransport: () => {}
      }
      const x1 = new SMTPMailer({
        mailer: mailer
      })
      spyOn(mailer, 'createTransport')

      x1.connect()

      expect(mailer.createTransport).toHaveBeenCalledWith({
        host: 'localhost',
        port: 25,
        secure: false,
        tls: { rejectUnauthorized: false }
      })
    })

    it('should call createTransport with smtp URI', () => {
      const mailer = {
        createTransport: () => {}
      }
      const x1 = new SMTPMailer({
        smtpUri: 'smtps://testhost.com:2020',
        mailer: mailer
      })
      spyOn(mailer, 'createTransport').and.returnValue(1236123)

      x1.connect()

      expect(mailer.createTransport).toHaveBeenCalledWith({
        host: 'testhost.com',
        port: 2020,
        secure: true,
        tls: { rejectUnauthorized: false }
      })
      expect(x1.transporter).toEqual(1236123)
    })

    it('should call createTransport with smtp URI default port', () => {
      const mailer = {
        createTransport: () => {}
      }
      const x1 = new SMTPMailer({
        smtpUri: 'smtp://testhost.com',
        mailer: mailer
      })
      spyOn(mailer, 'createTransport').and.returnValue(1236123)

      x1.connect()

      expect(mailer.createTransport).toHaveBeenCalledWith({
        host: 'testhost.com',
        port: 25,
        secure: false,
        tls: { rejectUnauthorized: false }
      })
      expect(x1.transporter).toEqual(1236123)
    })
  })

  describe('disconnect', () => {
    it('should clear transporter', () => {
      const x1 = new SMTPMailer()

      x1.transporter = 1236123
      x1.disconnect()
      expect(x1.transporter).toBeNull()
    })
  })

  describe('getDomain', () => {
    it('should return default domain', () => {
      const x1 = new SMTPMailer()

      expect(x1.getDomain()).toEqual('example.com')
    })

    it('should return specific domain', () => {
      const x1 = new SMTPMailer({ domain: 'maildomain.com' })

      expect(x1.getDomain()).toEqual('maildomain.com')
    })
  })

  describe('sendMail', () => {
    it('should log, call transporter and callback', () => {
      const transporter = {
        sendMail: (email, callback) => { callback(null) }
      }
      spyOn(transporter, 'sendMail').and.callThrough()

      const mailer = {
        createTransport: () => { return transporter }
      }
      spyOn(mailer, 'createTransport').and.callThrough()

      const x2 = { callback: () => {} }
      spyOn(x2, 'callback')

      const logger = new LoggerMock()

      const x1 = new SMTPMailer({
        smtpUri: 'smtps://testhost.com:2020',
        logger: logger,
        mailer: mailer
      })

      x1.connect()
      expect(x1.mailer.createTransport).toHaveBeenCalled()

      x1.sendMail({
        from: 'testfrom@example.com',
        to: 'testto@example.com'
      }, x2.callback)

      expect(logger.info).toHaveBeenCalledWith('(SMTPMailer) Sending Email testfrom@example.com -> testto@example.com')
      expect(transporter.sendMail).toHaveBeenCalledWith({ from: 'testfrom@example.com', to: 'testto@example.com' }, jasmine.any(Function))
      expect(x2.callback).toHaveBeenCalledWith(null)
    })

    it('should log and return mailer error in callback', () => {
      const err = { error: 'this is an error' }
      const transporter = {
        sendMail: (email, callback) => { callback(err) }
      }
      spyOn(transporter, 'sendMail').and.callThrough()

      const mailer = {
        createTransport: () => { return transporter }
      }
      spyOn(mailer, 'createTransport').and.callThrough()

      const x2 = { callback: () => {} }
      spyOn(x2, 'callback')

      const logger = new LoggerMock()

      const x1 = new SMTPMailer({
        smtpUri: 'smtps://testhost.com:2020',
        logger: logger,
        mailer: mailer
      })

      x1.connect()
      expect(x1.mailer.createTransport).toHaveBeenCalled()

      x1.sendMail({
        from: 'testfrom@example.com',
        to: 'testto@example.com'
      }, x2.callback)

      expect(logger.info).toHaveBeenCalledWith('(SMTPMailer) Sending Email testfrom@example.com -> testto@example.com')
      expect(transporter.sendMail).toHaveBeenCalledWith({ from: 'testfrom@example.com', to: 'testto@example.com' }, jasmine.any(Function))
      expect(logger.error).toHaveBeenCalledWith('(SMTPMailer) SMTPMailer Error: ', err)
      expect(x2.callback).toHaveBeenCalledWith(err)
    })
  })
})
