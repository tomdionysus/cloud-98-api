const Session = require('../lib/Session')
const KVStoreMock = require('./mocks/KVStoreMock')
const LoggerMock = require('./mocks/LoggerMock')

describe('Session', () => {
  let logger

  beforeEach(() => {
    logger = new LoggerMock()
  })

  describe('Init', () => {
    it('should allow New', () => {
      const x1 = new Session({ kvstore: new KVStoreMock() })
      const x2 = new Session({ kvstore: new KVStoreMock() })

      expect(x1).not.toBe(x2)
    })

    it('should throw on no kvstore', () => {
      expect(() => { new Session() }).toThrow(Error('kvstore not set'))
    })
  })

  describe('create', () => {
    it('should call save', () => {
      const x1 = new Session({ kvstore: new KVStoreMock(), logger: logger })
      spyOn(x1, 'save').and.callThrough()

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.create({ data: 1 }, 84000, cb.callback)
      expect(x1.save).toHaveBeenCalledWith(jasmine.anyHash256, { data: 1, id: jasmine.anyHash256 }, 84000, jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, jasmine.anyHash256)
      expect(logger.debug).toHaveBeenCalledWith('(Session) Creating Session %s, expires in %d sec', jasmine.anyHash256, 84000)
    })
  })

  describe('load', () => {
    it('should call get', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnData: '{"data":2}' }), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.load('asdfghjkl', cb.callback)
      expect(x1.kvstore.get).toHaveBeenCalledWith('asdfghjkl', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, 'asdfghjkl', { data: 2 })
      expect(logger.debug).toHaveBeenCalledWith('(Session) Loaded Session %s', 'asdfghjkl')
    })

    it('should call get with no data on not found', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnData: null }), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.load('asdfghjkl', cb.callback)
      expect(x1.kvstore.get).toHaveBeenCalledWith('asdfghjkl', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, 'asdfghjkl', null)
      expect(logger.debug).toHaveBeenCalledWith('(Session) Session %s Not Found', 'asdfghjkl')
    })

    it('should call get and pass on error', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnErrorGet: 'ERROR' }), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.load('asdfghjkl', cb.callback)
      expect(x1.kvstore.get).toHaveBeenCalledWith('asdfghjkl', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
      expect(logger.debug).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith('(Session) Loading Session %s Error', 'asdfghjkl', 'ERROR')
    })

    it('should call get and return no data on JSON decode failure', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnData: 'bad_json' }), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.load('asdfghjkl', cb.callback)
      expect(x1.kvstore.get).toHaveBeenCalledWith('asdfghjkl', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, 'asdfghjkl', null)
      expect(logger.debug).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith('(Session) Loading Session %s - Corrupt Session Data, Bad JSON', 'asdfghjkl')
    })

    it('should throw on undefined sessionId', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnData: 'bad_json' }), logger: logger })
      expect(() => { x1.load(undefined) }).toThrow(Error('Session: load - sessionId is not defined'))
    })
  })

  describe('save', () => {
    it('should call set', () => {
      const x1 = new Session({ kvstore: new KVStoreMock(), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.save('asdfghjkl', { data: 1 }, 84000, cb.callback)
      expect(x1.kvstore.set).toHaveBeenCalledWith('asdfghjkl', '{"data":1}', 84000, jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, 'asdfghjkl')
      expect(logger.debug).toHaveBeenCalledWith('(Session) Saved Session %s, expires in %d sec', 'asdfghjkl', 84000)
    })

    it('should call set and pass on error', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnErrorSet: 'ERROR' }), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.save('asdfghjkl', { data: 1 }, 84000, cb.callback)
      expect(x1.kvstore.set).toHaveBeenCalledWith('asdfghjkl', '{"data":1}', 84000, jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
      expect(logger.debug).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith('(Session) Saving Session %s error', 'asdfghjkl', 'ERROR')
    })

    it('should throw on undefined sessionId', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnData: 'bad_json' }), logger: logger })
      expect(() => { x1.save(undefined) }).toThrow(Error('Session: save - sessionId is not defined'))
    })
  })

  describe('delete', () => {
    it('should call del', () => {
      const x1 = new Session({ kvstore: new KVStoreMock(), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.delete('asdfghjkl', cb.callback)
      expect(x1.kvstore.del).toHaveBeenCalledWith('asdfghjkl', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith(null, 'asdfghjkl')
      expect(logger.debug).toHaveBeenCalledWith('(Session) Deleted Session %s', 'asdfghjkl')
    })

    it('should call del and pass on error', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnErrorDel: 'ERROR' }), logger: logger })

      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      x1.delete('asdfghjkl', cb.callback)
      expect(x1.kvstore.del).toHaveBeenCalledWith('asdfghjkl', jasmine.any(Function))
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
      expect(logger.debug).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith('(Session) Deleting Session %s error', 'asdfghjkl', 'ERROR')
    })

    it('should throw on undefined sessionId', () => {
      const x1 = new Session({ kvstore: new KVStoreMock({ returnData: 'bad_json' }), logger: logger })
      expect(() => { x1.delete(undefined) }).toThrow(Error('Session: delete - sessionId is not defined'))
    })
  })
})
