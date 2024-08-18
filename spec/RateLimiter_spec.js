const RateLimiter = require('../lib/RateLimiter')
const LoggerMock = require('./mocks/LoggerMock')

describe('RateLimiter', () => {
  it('should allow New', () => {
    const x1 = new RateLimiter({ logger: new LoggerMock() })
    const x2 = new RateLimiter({ logger: new LoggerMock() })

    expect(x1).not.toBe(x2)
    expect(x1.ipAddressHeader).toEqual('x-forwarded-for')
  })

  describe('register', () => {
    it('should add callback to handlers list', () => {
      const x1 = new RateLimiter({ logger: new LoggerMock() })
      expect(x1.handlers).toEqual([])

      const cb = () => {}
      x1.register(cb)

      expect(x1.handlers).toEqual([cb])
    })
  })

  describe('getKey', () => {
    it('should return correct key', () => {
      const x1 = new RateLimiter({ logger: new LoggerMock() })

      const req = { headers: { 'x-forwarded-for': '212.67.202.53' }, connection: { remoteAddress: '212.67.202.53' } }

      expect(x1.getKey(req)).toEqual(jasmine.anyHash256)
    })
  })
})
