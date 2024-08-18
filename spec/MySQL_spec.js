const mysqllib = require('mysql')

const LoggerMock = require('./mocks/LoggerMock')
const KVStoreMock = require('./mocks/KVStoreMock')
const MySQL = require('../lib/MySQL')

describe('MySQL', () => {
  let logger

  beforeEach(() => {
    logger = new LoggerMock()
  })

  it('should allow New', () => {
    const x1 = new MySQL()
    const x2 = new MySQL()

    expect(x1).not.toBe(x2)
  })

  it('should have correct defaults', () => {
    const x1 = new MySQL()

    expect(x1.logger).not.toBeNull()
    expect(x1.logger.scope).toEqual('MySQL')
    expect(x1.mysql).toBe(mysqllib)
    expect(x1.kvstore).toBeUndefined()
  })

  describe('_query', () => {
    it('should log, call pool query and callback', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const conn = {
        logger: logger,
        pool: {
          query: (query, param, callback) => { callback(null, 'DATA', 'FIELDS') }
        }
      }
      spyOn(conn.pool, 'query').and.callThrough()

      MySQL._query(conn, 'QUERY', ['PARAM'], cb.callback)

      // TODO: Sometimes fails with 1ms if the test is slow. 
      // expect(logger.debug).toHaveBeenCalledWith('Query `QUERY` (["PARAM"]) [0ms]')
      expect(conn.pool.query).toHaveBeenCalledWith('QUERY', ['PARAM'], jasmine.any(Function))
      expect(logger.error).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith(null, 'DATA', 'FIELDS')
    })

    it('should log, call pool query and log and pass error on callback', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const conn = {
        logger: logger,
        pool: {
          query: (query, param, callback) => { callback('ERROR') }
        }
      }
      spyOn(conn.pool, 'query').and.callThrough()

      MySQL._query(conn, 'QUERY', ['PARAM'], cb.callback)

       // TODO: Sometimes fails with 1ms if the test is slow. 
      // expect(logger.debug).toHaveBeenCalledWith('Query `QUERY` (["PARAM"]) [0ms]')
      expect(conn.pool.query).toHaveBeenCalledWith('QUERY', ['PARAM'], jasmine.any(Function))
      expect(logger.error).toHaveBeenCalledWith('ERROR ON `QUERY` (["PARAM"])')
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })

  describe('_cachequery', () => {
    it('should pass to _query if caching disabled', () => {
      const x1 = new MySQL()

      const r = MySQL._query
      spyOn(MySQL, '_query')

      const conn = {
        logger: logger
      }

      x1._cachequery(conn, 'QUERY', 'PARAMS', 'EXPIRY', 'CALLBACK')

      expect(MySQL._query).toHaveBeenCalledWith({ logger: jasmine.any(LoggerMock) }, 'QUERY', 'PARAMS', 'CALLBACK')
      expect(logger.debug).not.toHaveBeenCalled()

      MySQL._query = r
    })

    it('should log and call kvstore get and callback on cache hit', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const x1 = new MySQL({ kvstore: new KVStoreMock({ returnData: '{"results":[{"test":1}],"fields":[{"field":"def"}]}' }) })

      const conn = {
        logger: logger
      }

      x1._cachequery(conn, 'QUERY', 'PARAMS', 'EXPIRY', cb.callback)

      expect(x1.kvstore.get).toHaveBeenCalledWith(jasmine.anyHash256, jasmine.any(Function))
      expect(logger.debug).toHaveBeenCalledWith('Cache Query `%s` (%s)', 'QUERY', '"PARAMS"')
      expect(logger.debug).toHaveBeenCalledWith('DB Cache HIT %s', jasmine.anyHash256)
      expect(cb.callback).toHaveBeenCalledWith(null, [{ test: 1 }], [{ field: 'def' }])
    })

    it('should log, call kvstore get, pass to _query on memcache miss, call set and callback', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const x1 = new MySQL({ kvstore: new KVStoreMock({ returnData: null }) })

      const r = MySQL._query
      MySQL._query = (conn, query, params, callback) => { callback(null, [{ data: 1 }], [{ field: 1 }]) }
      spyOn(MySQL, '_query').and.callThrough()

      const conn = {
        logger: logger
      }

      x1._cachequery(conn, 'QUERY', 'PARAMS', 'EXPIRY', cb.callback)

      expect(MySQL._query).toHaveBeenCalledWith({ logger: jasmine.any(LoggerMock) }, 'QUERY', 'PARAMS', jasmine.any(Function))

      expect(logger.debug).toHaveBeenCalledWith('Cache Query `%s` (%s)', 'QUERY', '"PARAMS"')
      expect(logger.debug).toHaveBeenCalledWith('DB Cache MISS %s', jasmine.anyHash256)
      expect(logger.error).not.toHaveBeenCalled()

      expect(x1.kvstore.get).toHaveBeenCalledWith(jasmine.anyHash256, jasmine.any(Function))
      expect(x1.kvstore.set).toHaveBeenCalledWith(jasmine.anyHash256, '{"results":[{"data":1}],"fields":[{"field":1}]}', 'EXPIRY', jasmine.any(Function))

      expect(cb.callback).toHaveBeenCalledWith(null, [{ data: 1 }], [{ field: 1 }])

      MySQL._query = r
    })

    it('should log, call kvstore get, pass to _query on memcache miss, warn and callback when data is too long', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const x1 = new MySQL({ kvstore: new KVStoreMock({ returnData: null }) })

      const r = MySQL._query
      MySQL._query = (conn, query, params, callback) => { callback(null, [{ data: 'XXXXXXXXXXXXXXXX'.repeat(65537) }], [{ field: 1 }]) }
      spyOn(MySQL, '_query').and.callThrough()

      const conn = {
        logger: logger
      }

      x1._cachequery(conn, 'QUERY', 'PARAMS', 'EXPIRY', cb.callback)

      expect(MySQL._query).toHaveBeenCalledWith({ logger: jasmine.any(LoggerMock) }, 'QUERY', 'PARAMS', jasmine.any(Function))

      expect(logger.debug).toHaveBeenCalledWith('Cache Query `%s` (%s)', 'QUERY', '"PARAMS"')
      expect(logger.debug).toHaveBeenCalledWith('DB Cache MISS %s', jasmine.anyHash256)
      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith('DB Cache Value >1Mb, cannot set %s', jasmine.anyHash256)

      expect(x1.kvstore.get).toHaveBeenCalledWith(jasmine.anyHash256, jasmine.any(Function))
      expect(x1.kvstore.set).not.toHaveBeenCalled()

      expect(cb.callback).toHaveBeenCalledWith(null, [{ data: jasmine.any(String) }], [{ field: 1 }])

      MySQL._query = r
    })

    it('should log, call kvstore get, pass to _query on memcache miss, call set, warn and callback when set fails', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const x1 = new MySQL({ kvstore: new KVStoreMock({ returnData: null, returnErrorSet: 'ERROR' }) })

      const r = MySQL._query
      MySQL._query = (conn, query, params, callback) => { callback(null, [{ data: 1 }], [{ field: 1 }]) }
      spyOn(MySQL, '_query').and.callThrough()

      const conn = {
        logger: logger
      }

      x1._cachequery(conn, 'QUERY', 'PARAMS', 'EXPIRY', cb.callback)

      expect(MySQL._query).toHaveBeenCalledWith({ logger: jasmine.any(LoggerMock) }, 'QUERY', 'PARAMS', jasmine.any(Function))

      expect(logger.debug).toHaveBeenCalledWith('Cache Query `%s` (%s)', 'QUERY', '"PARAMS"')
      expect(logger.debug).toHaveBeenCalledWith('DB Cache MISS %s', jasmine.anyHash256)
      expect(logger.warn).toHaveBeenCalledWith('Saving DB Cache %s Failed: ', jasmine.anyHash256, 'ERROR')
      expect(logger.error).not.toHaveBeenCalled()

      expect(x1.kvstore.get).toHaveBeenCalledWith(jasmine.anyHash256, jasmine.any(Function))
      expect(x1.kvstore.set).toHaveBeenCalledWith(jasmine.anyHash256, '{"results":[{"data":1}],"fields":[{"field":1}]}', 'EXPIRY', jasmine.any(Function))

      expect(cb.callback).toHaveBeenCalledWith(null, [{ data: 1 }], [{ field: 1 }])

      MySQL._query = r
    })

    it('should log, call kvstore get, pass to _query on memcache miss and callback with _query error', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const x1 = new MySQL({ kvstore: new KVStoreMock({ returnData: null }) })

      const r = MySQL._query
      MySQL._query = (conn, query, params, callback) => { callback('DBERROR') }
      spyOn(MySQL, '_query').and.callThrough()

      const conn = {
        logger: logger
      }

      x1._cachequery(conn, 'QUERY', 'PARAMS', 'EXPIRY', cb.callback)

      expect(MySQL._query).toHaveBeenCalledWith({ logger: jasmine.any(LoggerMock) }, 'QUERY', 'PARAMS', jasmine.any(Function))

      expect(logger.debug).toHaveBeenCalledWith('Cache Query `%s` (%s)', 'QUERY', '"PARAMS"')
      expect(logger.debug).toHaveBeenCalledWith('DB Cache MISS %s', jasmine.anyHash256)
      expect(logger.error).not.toHaveBeenCalled()

      expect(x1.kvstore.get).toHaveBeenCalledWith(jasmine.anyHash256, jasmine.any(Function))
      expect(x1.kvstore.set).not.toHaveBeenCalled()

      expect(cb.callback).toHaveBeenCalledWith('DBERROR')

      MySQL._query = r
    })

    it('should log, call kvstore get and pass to _query on memcache err', () => {
      const x1 = new MySQL({ kvstore: new KVStoreMock({ returnError: 'ERROR' }) })

      const r = MySQL._query
      spyOn(MySQL, '_query')

      const conn = {
        logger: logger
      }

      x1._cachequery(conn, 'QUERY', 'PARAMS', 'EXPIRY', 'CALLBACK')

      expect(MySQL._query).toHaveBeenCalledWith({ logger: jasmine.any(LoggerMock) }, 'QUERY', 'PARAMS', 'CALLBACK')
      expect(logger.warn).toHaveBeenCalledWith('Loading DB Cache %s Failed: ', jasmine.anyHash256, 'ERROR')

      MySQL._query = r
    })
  })

  describe('_query', () => {
    it('should call through to _cachequery', () => {
      const cb = {
        callback: () => {}
      }

      const x1 = new MySQL()

      spyOn(x1, '_cachequery')

      x1.cachequery('QUERY', ['PARAM'], 'EXPIRY', cb.callback)

      expect(x1._cachequery).toHaveBeenCalledWith(x1, 'QUERY', ['PARAM'], 'EXPIRY', cb.callback)
    })
  })

  describe('query', () => {
    it('should call through to _query', () => {
      const cb = {
        callback: () => {}
      }

      const x1 = new MySQL()

      spyOn(MySQL, '_query')

      x1.query('QUERY', ['PARAM'], cb.callback)

      expect(MySQL._query).toHaveBeenCalledWith(x1, 'QUERY', ['PARAM'], cb.callback)
    })
  })

  describe('begin', () => {
    it('should log, call pool getConnection, call conn beginTransaction and callback', () => {
      let trans

      const cb = {
        callback: (err, tr) => { trans = tr }
      }
      spyOn(cb, 'callback').and.callThrough()

      const x1 = new MySQL({ logger: logger })

      const conn = {
        beginTransaction: (callback) => { callback(null) }
      }
      spyOn(conn, 'beginTransaction').and.callThrough()

      x1.pool = {
        getConnection: (callback) => { callback(null, conn) }
      }
      spyOn(x1.pool, 'getConnection').and.callThrough()

      x1.begin(cb.callback)

      expect(x1.pool.getConnection).toHaveBeenCalledWith(jasmine.any(Function))
      expect(logger.error).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith(null, jasmine.any(MySQL.Transaction))
      expect(trans.engine).toBe(x1)
      expect(trans.pool).toBe(conn)
    })

    it('should log, call pool getConnection and callback with error on fail', () => {
      let trans

      const cb = {
        callback: (err, tr) => { trans = tr }
      }
      spyOn(cb, 'callback').and.callThrough()

      const x1 = new MySQL({ logger: logger })

      const conn = {
        beginTransaction: (callback) => { callback(null) }
      }
      spyOn(conn, 'beginTransaction').and.callThrough()

      x1.pool = {
        getConnection: (callback) => { callback('ERROR') }
      }
      spyOn(x1.pool, 'getConnection').and.callThrough()

      x1.begin(cb.callback)

      expect(x1.pool.getConnection).toHaveBeenCalledWith(jasmine.any(Function))
      expect(logger.error).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
      expect(trans).toBeUndefined()
    })

    it('should log, call pool getConnection, call conn beginTransaction and callback with error on bT fail', () => {
      let trans

      const cb = {
        callback: (err, tr) => { trans = tr }
      }
      spyOn(cb, 'callback').and.callThrough()

      const x1 = new MySQL({ logger: logger })

      const conn = {
        beginTransaction: (callback) => { callback('BTERROR') }
      }
      spyOn(conn, 'beginTransaction').and.callThrough()

      x1.pool = {
        getConnection: (callback) => { callback(null, conn) }
      }
      spyOn(x1.pool, 'getConnection').and.callThrough()

      x1.begin(cb.callback)

      expect(x1.pool.getConnection).toHaveBeenCalledWith(jasmine.any(Function))
      expect(logger.error).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith('BTERROR')
      expect(trans).toBeUndefined()
    })
  })

  describe('end', () => {
    it('should log, call pool end and callback', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const x1 = new MySQL({ logger: logger })

      x1.pool = {
        end: (callback) => { callback(null) }
      }
      spyOn(x1.pool, 'end').and.callThrough()

      x1.end(cb.callback)

      expect(logger.debug).toHaveBeenCalledWith('(MySQL) Pool Connection Ended')
      expect(x1.pool.end).toHaveBeenCalledWith(jasmine.any(Function))
      expect(logger.error).not.toHaveBeenCalled()
      expect(cb.callback).toHaveBeenCalledWith(null)
    })

    it('should log, call pool end and pass error to callback', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const x1 = new MySQL({ logger: logger })

      x1.pool = {
        end: (callback) => { callback('ERROR') }
      }
      spyOn(x1.pool, 'end').and.callThrough()

      x1.end(cb.callback)

      expect(logger.debug).not.toHaveBeenCalled()
      expect(x1.pool.end).toHaveBeenCalledWith(jasmine.any(Function))
      expect(logger.error).toHaveBeenCalledWith('(MySQL) Error while ending Pool Connection', 'ERROR')
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })

  describe('connect', () => {
    it('should log, call pool connect and callback', () => {
      const x1 = new MySQL({
        logger: logger,
        host: 'host',
        user: 'user',
        password: 'password',
        database: 'database'
      })

      const conn = {
        release: () => {}
      }
      spyOn(conn, 'release')

      const pool = {
        getConnection: (callback) => { callback(null, conn) }
      }
      spyOn(pool, 'getConnection').and.callThrough()

      x1.mysql = {
        createPool: () => { return pool }
      }
      spyOn(x1.mysql, 'createPool').and.callThrough()

      x1.connect()

      expect(x1.mysql.createPool).toHaveBeenCalledWith({ host: 'host', user: 'user', password: 'password', database: 'database' })
      expect(pool.getConnection).toHaveBeenCalledWith(jasmine.any(Function))
      expect(logger.info).toHaveBeenCalledWith('(MySQL) Connected')
      expect(conn.release).toHaveBeenCalledWith()
      expect(x1.pool).toBe(pool)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should log, call pool connect and pass error callback', () => {
      const x1 = new MySQL({
        logger: logger,
        host: 'host',
        user: 'user',
        password: 'password',
        database: 'database'
      })

      const conn = {
        release: () => {}
      }
      spyOn(conn, 'release')

      const pool = {
        getConnection: (callback) => { callback('ERROR') }
      }
      spyOn(pool, 'getConnection').and.callThrough()

      x1.mysql = {
        createPool: () => { return pool }
      }
      spyOn(x1.mysql, 'createPool').and.callThrough()

      x1.connect()

      expect(x1.mysql.createPool).toHaveBeenCalledWith({ host: 'host', user: 'user', password: 'password', database: 'database' })
      expect(pool.getConnection).toHaveBeenCalledWith(jasmine.any(Function))
      expect(logger.error).toHaveBeenCalledWith('(MySQL) Cannot Connect Database', 'ERROR')
      expect(logger.info).not.toHaveBeenCalled()
      expect(x1.pool).toBe(pool)
    })
  })

  describe('getSQLOrderSortBy', () => {
    it('should return correct SQL', () => {
      const context = {
        sort_by: 'one'
      }
      const allowed = ['one', 'two']

      expect(MySQL.getSQLOrderSortBy(context, allowed)).toEqual(' ORDER BY one,id')
    })

    it('should return correct SQL and direction', () => {
      const context = {
        sort_by: 'one',
        sort_dir: 'desc'
      }
      const allowed = ['one', 'two']

      expect(MySQL.getSQLOrderSortBy(context, allowed)).toEqual(' ORDER BY one DESC,id')
    })

    it('should return correct SQL with no sort_by', () => {
      const context = {}
      const allowed = ['one', 'two']

      expect(MySQL.getSQLOrderSortBy(context, allowed)).toEqual(' ORDER BY one,id')
    })

    it('should return correct SQL with no sort_by and direction', () => {
      const context = {}
      const allowed = ['one', 'two']

      expect(MySQL.getSQLOrderSortBy(context, allowed, 'desc')).toEqual(' ORDER BY one DESC,id')
    })
  })

  describe('bigid', () => {
    it('should return a random BigInt', () => {
      expect(MySQL.bigid()).toMatch(/[0-9]{8,}/)
    })

    it('should call static bigint on instance call', () => {
      let x1 = new MySQL()

      spyOn(MySQL,'bigid')

      x1.bigid()
      expect(MySQL.bigid).toHaveBeenCalledWith()
    })
  })

  describe('getSQLPagination', () => {
    it('should return correct SQL', () => {
      const context = {}

      expect(MySQL.getSQLPagination(context, 1024)).toEqual('LIMIT 0,20')
    })

    it('should return correct SQL for non-null page', () => {
      const context = {
        page: 42
      }

      expect(MySQL.getSQLPagination(context, 1024)).toEqual('LIMIT 840,20')
    })
  })

  describe('getUniqueIdsFromResultsField', () => {
    it('should call return correct ids', () => {
      const context = [
        { id: '1', name: 'OK' },
        { id: '1', name: 'OK' },
        { id: '2', name: 'OK' },
        { id: '3', name: 'OK' },
        { id: '4', name: 'OK' },
        { id: '4', name: 'OK' },
      ]


      expect(MySQL.getUniqueIdsFromResultsField(context,'id')).toEqual(['1','2','3','4'])
    })

    it('should call instance call on static invocation', () => {
      let x1 = new MySQL()

      spyOn(MySQL,'getUniqueIdsFromResultsField')
      x1.getUniqueIdsFromResultsField('PARAMS','FIELD')
      expect(MySQL.getUniqueIdsFromResultsField).toHaveBeenCalledWith('PARAMS','FIELD')
    })
  })

  describe('asyncTransaction', () => {
    it('should call begin, functions, commit and callback with results', () => {
      const x1 = new MySQL({ logger: logger })

      var test = {
        transaction: {
          commit: (callback) => { return callback(null) },
          rollback: (callback) => { return callback(null) }
        },

        begin: (callback) => { return callback(null, test.transaction) },
        fn1: (transaction, cb) => { return cb(null, 1) },
        fn2: (transaction, cb) => { return cb(null, 2) },
        fn3: (transaction, cb) => { return cb(null, 3) },
        fin: () => { }
      }

      spyOn(x1, 'begin').and.callFake(test.begin)
      spyOn(test, 'fn1').and.callThrough()
      spyOn(test, 'fn2').and.callThrough()
      spyOn(test, 'fn3').and.callThrough()
      spyOn(test.transaction, 'commit').and.callThrough()
      spyOn(test.transaction, 'rollback').and.callThrough()
      spyOn(test, 'fin').and.callThrough()

      x1.asyncTransaction([
        test.fn1,
        test.fn2,
        test.fn3
      ], (err, results) => {
        test.fin(err, results)

        expect(x1.begin).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.fn1).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.fn2).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.fn3).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.transaction.commit).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.transaction.rollback).not.toHaveBeenCalled()
        expect(test.fin).toHaveBeenCalledWith(null, [1, 2, 3])
      })
    })

    it('should call begin, functions, rollback and callback with results on error, truncating fn chain', () => {
      const x1 = new MySQL({ logger: logger })

      var test = {
        transaction: {
          commit: (callback) => { return callback(null) },
          rollback: (callback) => { return callback(null) }
        },

        begin: (callback) => { return callback(null, test.transaction) },
        fn1: (transaction, cb) => { return cb(null, 1) },
        fn2: (transaction, cb) => { return cb('ERROR', 2) },
        fn3: (transaction, cb) => { return cb(null, 3) },
        fin: () => { }
      }

      spyOn(x1, 'begin').and.callFake(test.begin)
      spyOn(test, 'fn1').and.callThrough()
      spyOn(test, 'fn2').and.callThrough()
      spyOn(test, 'fn3').and.callThrough()
      spyOn(test.transaction, 'commit').and.callThrough()
      spyOn(test.transaction, 'rollback').and.callThrough()
      spyOn(test, 'fin').and.callThrough()

      x1.asyncTransaction([
        test.fn1,
        test.fn2,
        test.fn3
      ], (err, results) => {
        test.fin(err, results)

        expect(x1.begin).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.fn1).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.fn2).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.fn3).not.toHaveBeenCalled()
        expect(test.transaction.rollback).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.transaction.commit).not.toHaveBeenCalled()
        expect(test.fin).toHaveBeenCalledWith('ERROR', [1, 2])
      })
    })

    it('should perform correctly when begin fails', () => {
      const x1 = new MySQL({ logger: logger })

      const test = {
        transaction: {
          commit: (callback) => { return callback(null) },
          rollback: (callback) => { return callback(null) }
        },

        begin: (callback) => { return callback('ERROR') },
        fn1: (transaction, cb) => { return cb(null, 1) },
        fn2: (transaction, cb) => { return cb(null, 2) },
        fn3: (transaction, cb) => { return cb(null, 3) },
        fin: () => { }
      }

      spyOn(x1, 'begin').and.callFake(test.begin)
      spyOn(test, 'fn1').and.callThrough()
      spyOn(test, 'fn2').and.callThrough()
      spyOn(test, 'fn3').and.callThrough()
      spyOn(test.transaction, 'commit').and.callThrough()
      spyOn(test.transaction, 'rollback').and.callThrough()
      spyOn(test, 'fin').and.callThrough()

      x1.asyncTransaction([
        test.fn1,
        test.fn2,
        test.fn3
      ], (err, results) => {
        test.fin(err, results)

        expect(x1.begin).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.fn1).not.toHaveBeenCalled()
        expect(test.fn2).not.toHaveBeenCalled()
        expect(test.fn3).not.toHaveBeenCalled()
        expect(test.transaction.rollback).not.toHaveBeenCalled()
        expect(test.transaction.commit).not.toHaveBeenCalled()
        expect(test.fin).toHaveBeenCalledWith('ERROR', [])
      })
    })

    it('should perform correctly when commit fails', () => {
      const x1 = new MySQL({ logger: logger })

      var test = {
        transaction: {
          commit: (callback) => { return callback('COMMITERROR') },
          rollback: (callback) => { return callback(null) }
        },

        begin: (callback) => { return callback(null, test.transaction) },
        fn1: (transaction, cb) => { return cb(null, 1) },
        fn2: (transaction, cb) => { return cb(null, 2) },
        fn3: (transaction, cb) => { return cb(null, 3) },
        fin: () => { }
      }

      spyOn(x1, 'begin').and.callFake(test.begin)
      spyOn(test, 'fn1').and.callThrough()
      spyOn(test, 'fn2').and.callThrough()
      spyOn(test, 'fn3').and.callThrough()
      spyOn(test.transaction, 'commit').and.callThrough()
      spyOn(test.transaction, 'rollback').and.callThrough()
      spyOn(test, 'fin').and.callThrough()

      x1.asyncTransaction([
        test.fn1,
        test.fn2,
        test.fn3
      ], (err, results) => {
        test.fin(err, results)

        expect(x1.begin).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.fn1).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.fn2).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.fn3).toHaveBeenCalledWith(test.transaction, jasmine.any(Function))
        expect(test.transaction.commit).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.transaction.rollback).toHaveBeenCalledWith(jasmine.any(Function))
        expect(test.fin).toHaveBeenCalledWith('COMMITERROR', [1, 2, 3])
      })
    })
  })
})

describe('Transaction', () => {
  let logger

  beforeEach(() => {
    logger = new LoggerMock()
  })

  describe('cachequery', () => {
    it('should call _cachequery on engine', () => {
      const engine = {
        _cachequery: () => {},
        logger: logger
      }
      spyOn(engine, '_cachequery')

      const x1 = new MySQL.Transaction({ engine: engine })

      x1.cachequery('QUERY', 'PARAMS', 'EXPIRY', 'CALLBACK')

      expect(engine._cachequery).toHaveBeenCalledWith(x1, 'QUERY', 'PARAMS', 'EXPIRY', 'CALLBACK')
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) BEGIN/))
    })
  })

  describe('query', () => {
    it('should call _query on MySQL', () => {
      const engine = {
        _cachequery: () => {},
        logger: logger
      }
      const r = MySQL._query
      spyOn(MySQL, '_query')

      const x1 = new MySQL.Transaction({ engine: engine })

      x1.query('QUERY', 'PARAMS', 'CALLBACK')

      expect(MySQL._query).toHaveBeenCalledWith(x1, 'QUERY', 'PARAMS', 'CALLBACK')
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) BEGIN/))

      MySQL._query = r
    })
  })

  describe('commit', () => {
    it('should call commit on pool and callback', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const engine = {
        logger: logger
      }
      const pool = {
        commit: (callback) => { callback(null) },
        release: () => { }
      }
      spyOn(pool, 'commit').and.callThrough()
      spyOn(pool, 'release').and.callThrough()

      const x1 = new MySQL.Transaction({ connection: pool, engine: engine })

      x1.commit(cb.callback)

      expect(pool.commit).toHaveBeenCalledWith(jasmine.any(Function))
      expect(pool.release).toHaveBeenCalled()
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) BEGIN/))
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) COMMIT/))
      expect(cb.callback).toHaveBeenCalledWith(null)
    })

    it('should call commit on pool and callback with error', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const engine = {
        logger: logger
      }
      const pool = {
        commit: (callback) => { callback('ERROR') },
        release: () => { }
      }
      spyOn(pool, 'commit').and.callThrough()
      spyOn(pool, 'release').and.callThrough()

      const x1 = new MySQL.Transaction({ connection: pool, engine: engine })

      x1.commit(cb.callback)

      expect(pool.commit).toHaveBeenCalledWith(jasmine.any(Function))
      expect(pool.release).toHaveBeenCalled()
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) BEGIN/))
      expect(engine.logger.error).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) COMMIT Error/), 'ERROR')
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })

  describe('rollback', () => {
    it('should call rollback on pool and callback', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const engine = {
        logger: logger
      }
      const pool = {
        rollback: (callback) => { callback(null) },
        release: () => { }
      }
      spyOn(pool, 'rollback').and.callThrough()
      spyOn(pool, 'release').and.callThrough()

      const x1 = new MySQL.Transaction({ connection: pool, engine: engine })

      x1.rollback(cb.callback)

      expect(pool.rollback).toHaveBeenCalledWith(jasmine.any(Function))
      expect(pool.release).toHaveBeenCalled()
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) BEGIN/))
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) ROLLBACK/))
      expect(cb.callback).toHaveBeenCalledWith(null)
    })

    it('should call rollback on pool and callback with error', () => {
      const cb = {
        callback: () => {}
      }
      spyOn(cb, 'callback')

      const engine = {
        logger: logger
      }
      const pool = {
        rollback: (callback) => { callback('ERROR') },
        release: () => { }
      }
      spyOn(pool, 'rollback').and.callThrough()
      spyOn(pool, 'release').and.callThrough()

      const x1 = new MySQL.Transaction({ connection: pool, engine: engine })

      x1.rollback(cb.callback)

      expect(pool.rollback).toHaveBeenCalledWith(jasmine.any(Function))
      expect(pool.release).toHaveBeenCalled()
      expect(engine.logger.debug).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) BEGIN/))
      expect(engine.logger.error).toHaveBeenCalledWith(jasmine.stringMatching(/\(Transaction [0-9a-f]{16}\) ROLLBACK Error/), 'ERROR')
      expect(cb.callback).toHaveBeenCalledWith('ERROR')
    })
  })
})
