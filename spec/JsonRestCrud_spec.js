const JsonRestCrud = require('../lib/JsonRestCrud')
const Validator = require('../lib/Validator')

const RouterMock = require('./mocks/RouterMock')
const SchemaMock = require('./mocks/SchemaMock')
const MySQLMock = require('./mocks/MySQLMock')
const APIServerMock = require('./mocks/APIServerMock')
const ResponseMock = require('./mocks/ResponseMock')

const path = require('path')

describe('JsonRestCrud', () => {
  it('should allow New', () => {
    const x1 = new JsonRestCrud()
    const x2 = new JsonRestCrud()

    expect(x1).not.toBe(x2)
  })

  describe('registerApiServer', () => {
    it('should register api server instance', () => {
      const x1 = new JsonRestCrud()

      const apiServer = 'APISERVER'
      x1.registerApiServer(apiServer)
      expect(x1.apiServer).toBe(apiServer)
    })
  })

  describe('registerCRUD', () => {
    it('should throw when table not found', () => {
      const schema = new SchemaMock({ returnData: null })
      const x1 = new JsonRestCrud({ schema: schema })

      expect(() => { x1.registerCRUD('/route', 'TABLE', 'C', true) }).toThrow(Error('registerCRUD: Table not found TABLE'))
    })

    it('should register CREATE', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')

      x1.registerCRUD('/route', 'TABLE', 'C', true)

      expect(x1.registerCreate).toHaveBeenCalledWith('/route', table, true)
      expect(x1.registerReadAll).not.toHaveBeenCalled()
      expect(x1.registerRead).not.toHaveBeenCalled()
      expect(x1.registerUpdate).not.toHaveBeenCalled()
      expect(x1.registerUpdateAll).not.toHaveBeenCalled()
      expect(x1.registerDelete).not.toHaveBeenCalled()
      expect(x1.registerDeleteAll).not.toHaveBeenCalled()
    })

    it('should register READ', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')

      x1.registerCRUD('/route', 'TABLE', 'R', true)

      expect(x1.registerCreate).not.toHaveBeenCalled()
      expect(x1.registerReadAll).toHaveBeenCalledWith('/route', table, true)
      expect(x1.registerRead).not.toHaveBeenCalled()
      expect(x1.registerUpdate).not.toHaveBeenCalled()
      expect(x1.registerUpdateAll).not.toHaveBeenCalled()
      expect(x1.registerDelete).not.toHaveBeenCalled()
      expect(x1.registerDeleteAll).not.toHaveBeenCalled()
    })

    it('should register READ_INDIVIDUAL', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')

      x1.registerCRUD('/route', 'TABLE', 'I', true)

      expect(x1.registerCreate).not.toHaveBeenCalled()
      expect(x1.registerReadAll).not.toHaveBeenCalled()
      expect(x1.registerRead).toHaveBeenCalledWith('/route', table, true)
      expect(x1.registerUpdate).not.toHaveBeenCalled()
      expect(x1.registerUpdateAll).not.toHaveBeenCalled()
      expect(x1.registerDelete).not.toHaveBeenCalled()
      expect(x1.registerDeleteAll).not.toHaveBeenCalled()
    })

    it('should register UPDATE', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')

      x1.registerCRUD('/route', 'TABLE', 'U', true)

      expect(x1.registerCreate).not.toHaveBeenCalled()
      expect(x1.registerReadAll).not.toHaveBeenCalled()
      expect(x1.registerRead).not.toHaveBeenCalled()
      expect(x1.registerUpdate).toHaveBeenCalledWith('/route', table, true)
      expect(x1.registerUpdateAll).not.toHaveBeenCalled()
      expect(x1.registerDelete).not.toHaveBeenCalled()
      expect(x1.registerDeleteAll).not.toHaveBeenCalled()
    })

    it('should register UPDATE_ALL', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')

      x1.registerCRUD('/route', 'TABLE', 'P', true)

      expect(x1.registerCreate).not.toHaveBeenCalled()
      expect(x1.registerReadAll).not.toHaveBeenCalled()
      expect(x1.registerRead).not.toHaveBeenCalled()
      expect(x1.registerUpdate).not.toHaveBeenCalled()
      expect(x1.registerUpdateAll).toHaveBeenCalledWith('/route', table, true)
      expect(x1.registerDelete).not.toHaveBeenCalled()
      expect(x1.registerDeleteAll).not.toHaveBeenCalled()
    })

    it('should register DELETE', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')

      x1.registerCRUD('/route', 'TABLE', 'D', true)

      expect(x1.registerCreate).not.toHaveBeenCalled()
      expect(x1.registerReadAll).not.toHaveBeenCalled()
      expect(x1.registerRead).not.toHaveBeenCalled()
      expect(x1.registerUpdate).not.toHaveBeenCalled()
      expect(x1.registerUpdateAll).not.toHaveBeenCalled()
      expect(x1.registerDelete).toHaveBeenCalledWith('/route', table, true)
      expect(x1.registerDeleteAll).not.toHaveBeenCalled()
    })

    it('should register DELETE_ALL', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')

      x1.registerCRUD('/route', 'TABLE', 'X', true)

      expect(x1.registerCreate).not.toHaveBeenCalled()
      expect(x1.registerReadAll).not.toHaveBeenCalled()
      expect(x1.registerRead).not.toHaveBeenCalled()
      expect(x1.registerUpdate).not.toHaveBeenCalled()
      expect(x1.registerUpdateAll).not.toHaveBeenCalled()
      expect(x1.registerDelete).not.toHaveBeenCalled()
      expect(x1.registerDeleteAll).toHaveBeenCalledWith('/route', table, true)
    })

    it('should register tag route', () => {
      const table = { name: 'TABLE' }
      const schema = new SchemaMock({ returnData: table })
      const x1 = new JsonRestCrud({ schema: schema })

      spyOn(x1, 'registerCreate')
      spyOn(x1, 'registerReadAll')
      spyOn(x1, 'registerRead')
      spyOn(x1, 'registerUpdate')
      spyOn(x1, 'registerUpdateAll')
      spyOn(x1, 'registerDelete')
      spyOn(x1, 'registerDeleteAll')
      spyOn(x1, 'registerTag')

      x1.registerCRUD('/route', 'TABLE', 'T', true)

      expect(x1.registerCreate).not.toHaveBeenCalled()
      expect(x1.registerReadAll).not.toHaveBeenCalled()
      expect(x1.registerRead).not.toHaveBeenCalled()
      expect(x1.registerUpdate).not.toHaveBeenCalled()
      expect(x1.registerUpdateAll).not.toHaveBeenCalled()
      expect(x1.registerDelete).not.toHaveBeenCalled()
      expect(x1.registerDeleteAll).not.toHaveBeenCalled()
      expect(x1.registerTag).toHaveBeenCalledWith('/route', table, true)
    })
  })

  describe('Register', () => {
    let r, schema, engine

    beforeEach(() => {
      r = new RouterMock()
      schema = new SchemaMock()
      engine = new JsonRestCrud({ router: r, schema: schema })
    })

    it('should register create route for tablename', () => {
      engine.registerCreate('/shift', 'shift')

      expect(r.register).toHaveBeenCalledWith('POST', '/shift', jasmine.any(Function))
    })

    it('should register patch route for tablename', () => {
      engine.registerUpdate('/shift', 'shift')

      expect(r.register).toHaveBeenCalled()
    })

    it('should register read route for tablename', () => {
      engine.registerReadAll('/shift', 'shift')

      expect(r.register).toHaveBeenCalled()
    })

    it('should register read individual route for tablename', () => {
      engine.registerRead('/shift', 'shift')

      expect(r.register).toHaveBeenCalled()
    })

    it('should register delete route for tablename', () => {
      engine.registerDeleteAll('/shift', 'shift')

      expect(r.register).toHaveBeenCalled()
    })

    it('should register delete individual route for tablename', () => {
      engine.registerDelete('/shift', 'shift')

      expect(r.register).toHaveBeenCalled()
    })
  })

  describe('registerReadAll', () => {
    let router, apiServer, engine

    beforeEach(() => {
      router = new RouterMock()
      apiServer = new APIServerMock()
      engine = new JsonRestCrud({ router: router, apiServer: apiServer })

      engine.registerReadAll('/shift', 'shift')
    })

    it('should register read route for tablename', () => {
      expect(router.register).toHaveBeenCalledWith('GET', '/shift', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_getAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalled()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._getAll).toHaveBeenCalledWith(tests.req, tests.res, 'shift', {}, tests.next)
    })

    it('should have read handler call next on segway', () => {
      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_getAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._getAll).not.toHaveBeenCalled()
    })

    it('should have read handler call status401End on not public and no session', () => {
      const tests = {
        req: { session: null },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_getAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._getAll).not.toHaveBeenCalled()
    })
  })

  describe('registerCreate', () => {
    let router, apiServer, engine

    beforeEach(() => {
      router = new RouterMock()
      apiServer = new APIServerMock()
      engine = new JsonRestCrud({ router: router, apiServer: apiServer })

      engine.registerCreate('/shift', 'shift')
    })

    it('should register Create route for tablename', () => {
      expect(router.register).toHaveBeenCalledWith('POST', '/shift', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_create')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalled()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._create).toHaveBeenCalledWith(tests.req, tests.res, 'shift', {}, tests.next)
    })

    it('should have Create handler call next on segway', () => {
      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_create')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._create).not.toHaveBeenCalled()
    })

    it('should have Create handler call status401End on not public and no session', () => {
      const tests = {
        req: { session: null },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_create')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._create).not.toHaveBeenCalled()
    })
  })

  describe('registerRead', () => {
    let router, apiServer, engine, table

    beforeEach(() => {
      router = new RouterMock()
      apiServer = new APIServerMock()
      engine = new JsonRestCrud({ router: router, apiServer: apiServer })
      table = { name: 'shift' }

      engine.registerRead('/shift', table)
    })

    it('should register ReadIndividual route for tablename', () => {
      expect(router.register).toHaveBeenCalledWith('GET', '/shift/{shift_id}', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: {}, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_get')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalled()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._get).toHaveBeenCalledWith(tests.req, tests.res, table, {}, tests.next)
    })

    it('should have ReadIndividual handler call next on segway', () => {
      const tests = {
        req: { session: {}, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_get')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._get).not.toHaveBeenCalled()
    })

    it('should have ReadIndividual handler call status401End on not public and no session', () => {
      const tests = {
        req: { session: null, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_get')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._get).not.toHaveBeenCalled()
    })
  })

  describe('registerDelete', () => {
    let router, apiServer, engine, table

    beforeEach(() => {
      router = new RouterMock()
      apiServer = new APIServerMock()
      engine = new JsonRestCrud({ router: router, apiServer: apiServer })
      table = { name: 'shift' }

      engine.registerDelete('/shift', table)
    })

    it('should register Delete route for tablename', () => {
      expect(router.register).toHaveBeenCalledWith('DELETE', '/shift/{shift_id}', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: {}, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_delete')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalled()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._delete).toHaveBeenCalledWith(tests.req, tests.res, table, {}, tests.next)
    })

    it('should have Delete handler call next on segway', () => {
      const tests = {
        req: { session: {}, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_delete')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._delete).not.toHaveBeenCalled()
    })

    it('should have Delete handler call status401End on not public and no session', () => {
      const tests = {
        req: { session: null, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_delete')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._delete).not.toHaveBeenCalled()
    })
  })

  describe('registerDeleteAll', () => {
    let router, apiServer, engine

    beforeEach(() => {
      router = new RouterMock()
      apiServer = new APIServerMock()
      engine = new JsonRestCrud({ router: router, apiServer: apiServer })

      engine.registerDeleteAll('/shift', 'shift')
    })

    it('should register DeleteAll route for tablename', () => {
      expect(router.register).toHaveBeenCalledWith('DELETE', '/shift', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_deleteAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalled()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._deleteAll).toHaveBeenCalledWith(tests.req, tests.res, 'shift', {}, tests.next)
    })

    it('should have DeleteAll handler call next on segway', () => {
      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_deleteAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._deleteAll).not.toHaveBeenCalled()
    })

    it('should have DeleteAll handler call status401End on not public and no session', () => {
      const tests = {
        req: { session: null },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_deleteAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._deleteAll).not.toHaveBeenCalled()
    })
  })

  describe('registerUpdateAll', () => {
    let router, apiServer, engine

    beforeEach(() => {
      router = new RouterMock()
      apiServer = new APIServerMock()
      engine = new JsonRestCrud({ router: router, apiServer: apiServer })

      engine.registerUpdateAll('/shift', 'shift')
    })

    it('should register UpdateAll route for tablename', () => {
      expect(router.register).toHaveBeenCalledWith('PATCH', '/shift', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_updateAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalled()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._updateAll).toHaveBeenCalledWith(tests.req, tests.res, 'shift', {}, tests.next)
    })

    it('should have UpdateAll handler call next on segway', () => {
      const tests = {
        req: { session: {} },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_updateAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._updateAll).not.toHaveBeenCalled()
    })

    it('should have UpdateAll handler call status401End on not public and no session', () => {
      const tests = {
        req: { session: null },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_updateAll')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._updateAll).not.toHaveBeenCalled()
    })
  })

  describe('registerUpdate', () => {
    let router, apiServer, engine, table

    beforeEach(() => {
      router = new RouterMock()
      apiServer = new APIServerMock()
      engine = new JsonRestCrud({ router: router, apiServer: apiServer })
      table = { name: 'shift' }

      engine.registerUpdate('/shift', table)
    })

    it('should register Update route for tablename', () => {
      expect(router.register).toHaveBeenCalledWith('PATCH', '/shift/{shift_id}', jasmine.any(Function))

      const tests = {
        req: { session: {}, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_update')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalled()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._update).toHaveBeenCalledWith(tests.req, tests.res, table, {}, tests.next)
    })

    it('should have Update handler call next on segway', () => {
      const tests = {
        req: { session: {}, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_update')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalled()
      expect(engine._update).not.toHaveBeenCalled()
    })

    it('should have Update handler call status401End on not public and no session', () => {
      const tests = {
        req: { session: null, params: { shift_id: 'VENUE_ID' } },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_update')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._update).not.toHaveBeenCalled()
    })
  })

  xdescribe('registerOpenApi', () => {
    it('Should register the openapi route', () => {
      const router = new RouterMock()
      const apiServer = new APIServerMock()
      const engine = new JsonRestCrud({ router: router, apiServer: apiServer })

      engine.registerOpenAPI('/openapi', true)

      expect(router.register).toHaveBeenCalledWith('GET', '/openapi', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: null },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_openApi')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalledWith(tests.res)
      expect(engine._openApi).toHaveBeenCalled()
    })

    it('Should give 401 if route is private and no session', () => {
      const router = new RouterMock()
      const apiServer = new APIServerMock()
      const engine = new JsonRestCrud({ router: router, apiServer: apiServer })

      engine.registerOpenAPI('/openapi', false)

      expect(router.register).toHaveBeenCalledWith('GET', '/openapi', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: null },
        res: { },
        item: { isSegway: false },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_openApi')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).not.toHaveBeenCalledWith()
      expect(apiServer.status401End).toHaveBeenCalledWith(tests.res)
      expect(engine._openApi).not.toHaveBeenCalled()
    })

    it('Should pass to next if segway', () => {
      const router = new RouterMock()
      const apiServer = new APIServerMock()
      const engine = new JsonRestCrud({ router: router, apiServer: apiServer })

      engine.registerOpenAPI('/openapi', true)

      expect(router.register).toHaveBeenCalledWith('GET', '/openapi', jasmine.any(Function))

      // Test supplied handler

      const tests = {
        req: { session: null },
        res: { },
        item: { isSegway: true },
        next: () => {}
      }
      spyOn(tests, 'next')
      spyOn(engine, '_openApi')
      spyOn(apiServer, 'status401End')

      router.register.lastParams.handler(tests.req, tests.res, tests.item, tests.next)

      expect(tests.next).toHaveBeenCalledWith()
      expect(apiServer.status401End).not.toHaveBeenCalledWith(tests.res)
      expect(engine._openApi).not.toHaveBeenCalled()
    })
  })

  describe('getAll', () => {
    it('gets all objects from a table', () => {
      const r = new RouterMock()
      const schema = new SchemaMock({ returnData: { where: [], params: [], limit: [], errors: [] } })
      const mySql = new MySQLMock()
      const engine = new JsonRestCrud({ router: r, schema: schema, mysql: mySql })
      const res = new ResponseMock()
      const table = { name: 'shift', handlers: {} }
      spyOn(engine, '_present').and.callFake((data) => { return data })
      engine._getAll({}, res, table, {}, () => {})
      expect(engine._present).toHaveBeenCalledWith(jasmine.any(Object),'shift')
      expect(mySql.query).toHaveBeenCalledWith('SELECT `shift`.* FROM ??', ['shift'], jasmine.any(Function))
    })
  })

  describe('getOne', () => {
    it('gets one object from a table', () => {
      const r = new RouterMock()
      const schema = new SchemaMock({ returnData: { where: [], params: [], limit: [], errors: [] } })
      const mySql = new MySQLMock()
      const engine = new JsonRestCrud({ router: r, schema: schema, mysql: mySql })
      const res = new ResponseMock()
      const table = { name: 'shift', handlers: {} }
      spyOn(engine, '_present').and.callFake((data) => { return data })
      engine._get({ params: { shift_id: '123' } }, res, table, {}, () => {})
      expect(engine._present).toHaveBeenCalledWith(jasmine.any(Object),'shift')
      expect(mySql.query).toHaveBeenCalledWith('SELECT `shift`.* FROM ?? WHERE (?? = ?)', ['shift', 'shift.id', '123'], jasmine.any(Function))
    })
  })

  describe('create', () => {
    it('Should create a new entry', () => {
      const r = new RouterMock()
      const schema = new SchemaMock({ returnData: { where: [], params: [], limit: [], errors: [] } })
      const mySql = new MySQLMock()
      const validator = new Validator({ validatorsPath: path.join(__dirname, './fixtures/validator') })
      validator.load()
      const engine = new JsonRestCrud({ router: r, schema: schema, mysql: mySql, validator: validator })
      spyOn(engine, '_present').and.callFake((data) => { return data })
      const res = new ResponseMock()
      const table = {
        name: 'request',
        getInsertData: () => {
          return {
            fields: ['name', 'id'],
            values: ['name', 'bob']
          }
        },
        handlers: {}
      }
      engine._create({ body: { name: 'name' } }, res, table, {}, () => {})
      expect(engine._present).toHaveBeenCalledWith(jasmine.any(Object),'request')
      expect(mySql.query).toHaveBeenCalledWith('INSERT INTO ?? (??) VALUES (?)', ['request', ['name', 'id'], ['name', 'bob']], jasmine.any(Function))
    })
  })

  describe('update', () => {
    let r, schema, mySql, validator, engine, res
    beforeEach(() => {
      r = new RouterMock()
      schema = new SchemaMock({ returnData: { where: [], params: [], limit: [], errors: [] } })
      mySql = new MySQLMock()
      validator = new Validator({ validatorsPath: path.join(__dirname, './fixtures/validator') })
      engine = new JsonRestCrud({ router: r, schema: schema, mysql: mySql, validator: validator })
      res = new ResponseMock()
      spyOn(engine, '_present').and.callFake((data) => { return data })
      validator.load()
    })

    it('Should update one object from a table', () => {
      const table = {
        name: 'request',
        getUpdateData: () => {
          return {
            assigns: ['?? = ?', '?? = ?'],
            values: ['request.request_number', 'T', 'request.id', '123']
          }
        },
        handlers: {}
      }
      engine._update({ params: { request_id: '123' }, body: { request_number: 'T' } }, res, table, {}, () => {})
      expect(engine._present).toHaveBeenCalledWith(jasmine.any(Object),'request')
      expect(mySql.query).toHaveBeenCalledWith('UPDATE ?? SET ?? = ?, ?? = ? WHERE (?? = ?)', [ 'request', 'request.request_number', 'T', 'request.id', '123', 'request.id', '123' ], jasmine.any(Function))
    })

    it('Should update one object in a scope', () => {
      const table = {
        name: 'request',
        scopes: { area_id: '123' },
        getUpdateData: () => {
          return {
            assigns: ['?? = ?', '?? = ?'],
            values: ['request.request_number', 'T', 'request.id', '123']
          }
        },
        handlers: {}
      }
      engine._update({ params: { request_id: '123', area_id: '123' }, body: { request_number: 'T', area_id: '123' }, scopes: { area_id: '123' } }, res, table, {}, () => {})
      expect(mySql.query).toHaveBeenCalledWith( 'UPDATE ?? SET ?? = ?, ?? = ? WHERE (?? = ?) AND (?? = ?)', [ 'request', 'request.request_number', 'T', 'request.id', '123', 'request.area_id', '123', 'request.id', '123' ], jasmine.any(Function))
    })

    it('Should send validator error for invalid field', () => {
      const table = {
        name: 'request',
        getUpdateData: () => {
          return {
            assigns: ['?? = ?', '?? = ?'],
            values: ['request.request_number', 'T', 'request.id', '123']
          }
        },
        handlers: {}
      }
      engine.apiServer = { status422End: () => {} }

      spyOn(engine.apiServer, 'status422End')
      engine._update({ params: { request_id: '123' }, body: { request_number: 'T', invalidField: 'nope' } }, res, table, {}, () => {})
      expect(engine._present).not.toHaveBeenCalled()
      expect(mySql.query).not.toHaveBeenCalled()
      expect(engine.apiServer.status422End).toHaveBeenCalled()
    })
  })

  describe('deleteAll', () => {
    let r, schema, mySql, engine, res
    beforeEach(() => {
      r = new RouterMock()
      schema = new SchemaMock({ returnData: { where: [], params: [], limit: [], errors: [] } })
      mySql = new MySQLMock()
      engine = new JsonRestCrud({ router: r, schema: schema, mysql: mySql })
      res = new ResponseMock()
    })

    it('delete all objects from a table', () => {
      const table = { name: 'shift', handlers: {} }
      engine._deleteAll({}, res, table, {}, () => {})
      expect(mySql.query).toHaveBeenCalledWith('DELETE FROM ??', ['shift'], jasmine.any(Function))
    })

    it('delete all objects from a table with scoped', () => {
      const table = { name: 'configuration', scopes: { shift_id: 'test', notInReq: 'test' }, handlers: {} }
      const req = { scopes: { shift_id: 'shiftId' } }
      engine._deleteAll(req, res, table, {}, () => {})
      expect(mySql.query).toHaveBeenCalledWith('DELETE FROM ?? WHERE (?? = ?)', ['configuration', 'configuration.shift_id', 'shiftId'], jasmine.any(Function))
    })
  })

  describe('tag', () => {
    let r, engine

    beforeEach(() => {
      r = new RouterMock()
      engine = new JsonRestCrud({ router: r })
    })

    it('should register route to create and delete tag', () => {
      spyOn(engine, '_createTag').and.callFake(() => {})
      spyOn(engine, '_deleteTag')

      engine.registerTag('/route', { name: 'test' }, true)
      expect(engine._createTag).toHaveBeenCalledWith('/route', { name: 'test' }, true)
      expect(engine._deleteTag).toHaveBeenCalledWith('/route', { name: 'test' }, true)
    })

    it('Should register create tag', () => {
      engine._createTag('/route', { name: 'test' }, true)
      expect(r.register).toHaveBeenCalled()
    })

    it('Should register delete tag', () => {
      engine._deleteTag('/route', { name: 'test' }, true)
      expect(r.register).toHaveBeenCalled()
    })
  })
})
