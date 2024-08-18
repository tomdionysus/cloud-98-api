const Router = require('../lib/Router')

describe('Router', () => {
  it('should allow New', () => {
    const x1 = new Router()
    const x2 = new Router()

    expect(x1).not.toBe(x2)
  })

  it('Segments should be independent', () => {
    const x1 = new Router()
    const x2 = new Router()

    x1.root.segments = { test: 1 }
    x2.root.segments = { test: 2 }

    expect(x1.root).not.toEqual(x2.root)
  })

  describe('register', () => {
    it('should allow new register simple route', () => {
      const x1 = new Router()

      // (path, context, params, callback) => { callback(null) }
      const callback = jasmine.createSpy('callback')

      x1.register('GET', '/path/to/something', callback)

      expect(x1.root.segments.path.segments.to.segments.something.callbacks).toEqual({ get: [callback] })
      expect(x1.root.segments.path.segments.to.callbacks).toEqual({})
      expect(x1.root.segments.path.callbacks).toEqual({})
      expect(x1.root.callbacks).toEqual({})
    })

    it('should allow register parameter route', () => {
      const x1 = new Router()

      // (path, context, params, callback) => { callback(null) }
      const callback = jasmine.createSpy('callback')

      x1.register('GET', '/path/{to}/something', callback)

      expect(x1.root.callbacks).toEqual({})
      expect(x1.root.segments.path.callbacks).toEqual({})
      expect(x1.root.segments.path.segments).toEqual({})
      expect(x1.root.segments.path.params).toEqual(['to'])
      expect(x1.root.segments.path.paramSegment.segments.something.callbacks).toEqual({ get: [callback] })
    })

    it('should allow new register wildcard route', () => {
      const x1 = new Router()

      // (path, context, params, callback) => { callback(null) }
      const callback = jasmine.createSpy('callback')

      x1.register('GET', '/*/to/something', callback)

      expect(x1.root.segments).toEqual({})
      expect(x1.root.callbacks).toEqual({})
      expect(x1.root.wildcard.callbacks).toEqual({})
      expect(x1.root.wildcard.segments.to.callbacks).toEqual({})
      expect(x1.root.wildcard.segments.to.segments.something.callbacks).toEqual({ get: [callback] })
    })

    it('should allow new root route', () => {
      const x1 = new Router()

      // (path, context, params, callback) => { callback(null) }
      const callback = jasmine.createSpy('callback')

      x1.register('GET', '/', callback)

      expect(x1.root.callbacks).toEqual({ get: [callback] })
    })
  })

  describe('route', () => {
    it('should route for single route', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()

      x1.register('GET', '/path', routecb)

      const req = { method: 'GET', path: '/path' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/path', params: {} }, { output: {} }, { isSegway: false }, jasmine.any(Function))
        expect(err).toBeUndefined()
      })
    })

    it('should return NOT_FOUND for single route with wrong verb', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()

      x1.register('GET', '/path', routecb)

      const req = { method: 'PATCH', path: '/path' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(routecb).not.toHaveBeenCalled()
        expect(err).toEqual('NOT_FOUND')
      })
    })

    it('should route for single route with wildcard verb', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()

      x1.register('*', '/path', routecb)

      const req = { method: 'POST', path: '/path' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(routecb).toHaveBeenCalledWith({ method: 'post', path: '/path', params: {} }, { output: {} }, { isSegway: false }, jasmine.any(Function))
        expect(err).toBeUndefined()
      })
    })

    it('should call both callbacks on single route', () => {
      const x1 = new Router()

      const fn = {
        routecb1: (req, res, item, ret) => { ret(null) },
        routecb2: (req, res, item, ret) => { ret(null) }
      }

      const routecb1 = spyOn(fn, 'routecb1').and.callThrough()
      const routecb2 = spyOn(fn, 'routecb2').and.callThrough()

      x1.register('GET', '/path', routecb1)
      x1.register('GET', '/path', routecb2)

      const req = { method: 'GET', path: '/path' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(routecb1).toHaveBeenCalledWith({ method: 'get', path: '/path', params: {} }, { output: {} }, { isSegway: false }, jasmine.any(Function))
        expect(routecb2).toHaveBeenCalledWith({ method: 'get', path: '/path', params: {} }, { output: {} }, { isSegway: false }, jasmine.any(Function))
        expect(err).toBeUndefined()
      })
    })

    it('should route for simple route', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) },
        nonroutecb1: (req, res, item, ret) => { ret(null) },
        nonroutecb2: (req, res, item, ret) => { ret(null) },
        nonroutecb3: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb1 = spyOn(fn, 'nonroutecb1').and.callThrough()
      const nonroutecb2 = spyOn(fn, 'nonroutecb2').and.callThrough()
      const nonroutecb3 = spyOn(fn, 'nonroutecb3').and.callThrough()

      x1.register('GET', '/path/to/something', routecb)

      x1.register('GET', '/path/to/something/else', nonroutecb1)
      x1.register('GET', '/path/to/different', nonroutecb2)
      x1.register('GET', '/path/elsewhere', nonroutecb3)

      const req = { method: 'GET', path: '/path/to/something' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/path/to/something', params: {} }, { output: {} }, { isSegway: false }, jasmine.any(Function))
        expect(nonroutecb1).not.toHaveBeenCalled()
        expect(nonroutecb2).not.toHaveBeenCalled()
        expect(nonroutecb3).not.toHaveBeenCalled()
        expect(err).toBeUndefined()
      })
    })

    it('should not route past end of defined route', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()

      x1.register('POST', '/session', routecb)

      const req = { method: 'POST', path: '/session/TESTID' }
      const res = { output: {} }

      x1.route(req, res, (err) => {
        expect(routecb).toHaveBeenCalled()
        expect(err).toEqual('NOT_FOUND')
      })
    })

    it('should route for root route', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) },
        nonroutecb1: (req, res, item, ret) => { ret(null) },
        nonroutecb2: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb1 = spyOn(fn, 'nonroutecb1').and.callThrough()
      const nonroutecb2 = spyOn(fn, 'nonroutecb2').and.callThrough()

      x1.register('GET', '/something', nonroutecb1)
      x1.register('GET', '/', routecb)
      x1.register('GET', '/path', nonroutecb2)

      const req = { method: 'GET', path: '/' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/', params: {} }, { output: {} }, { isSegway: false }, jasmine.any(Function))
        expect(nonroutecb1).not.toHaveBeenCalled()
        expect(nonroutecb2).not.toHaveBeenCalled()
        expect(err).toBeUndefined()
      })
    })

    it('should not call anything on unrecognised route', () => {
      const x1 = new Router()

      const fn = {
        nonroutecb1: (req, res, item, ret) => { ret(null) },
        nonroutecb2: (req, res, item, ret) => { ret(null) }
      }

      const nonroutecb1 = spyOn(fn, 'nonroutecb1').and.callThrough()
      const nonroutecb2 = spyOn(fn, 'nonroutecb2').and.callThrough()

      x1.register('GET', '/something', nonroutecb1)
      x1.register('GET', '/else', nonroutecb2)

      const req = { method: 'GET', path: '/notthis' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(nonroutecb1).not.toHaveBeenCalled()
        expect(nonroutecb2).not.toHaveBeenCalled()
        expect(err).toEqual('NOT_FOUND')
      })
    })

    it('should return error if route is not found', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()

      x1.register('GET', '/else', routecb)

      const req = { method: 'GET', path: '/notthis' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(routecb).not.toHaveBeenCalled()
        expect(err).toEqual('NOT_FOUND')
      })
    })

    it('should call segway when overall route is not found', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) },
        nonroutecb2: (req, res, item, ret) => { ret(null) }
      }

      const segwaycb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb2 = spyOn(fn, 'nonroutecb2').and.callThrough()

      x1.register('GET', '/', segwaycb)
      x1.register('GET', '/else', nonroutecb2)

      const req = { method: 'GET', path: '/notthis' }
      const res = { output: {} }
      x1.route(req, res, (err) => {
        expect(segwaycb).toHaveBeenCalledWith({ method: 'get', path: '/notthis', params: {} }, { output: {} }, { isSegway: true }, jasmine.any(Function))
        expect(nonroutecb2).not.toHaveBeenCalled()
        expect(err).toEqual('NOT_FOUND')
      })
    })

    it('should route for segway routes', () => {
      const x1 = new Router()

      const fn = {
        segway: (req, res, item, ret) => { ret(null) },
        routecb: (req, res, item, ret) => { ret(null) },
        badcb: (req, res, item, ret) => { ret(null) }
      }

      const segwaycb = spyOn(fn, 'segway').and.callThrough()
      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const badcb = spyOn(fn, 'badcb').and.callThrough()

      x1.register('*', '/test', segwaycb)
      x1.register('GET', '/test/something', routecb)
      x1.register('GET', '/test/something/else', badcb)

      const req = { method: 'GET', path: '/test/something' }
      const res = { output: { context: 2 } }
      x1.route(req, res, () => {
        expect(segwaycb).toHaveBeenCalledWith({ method: 'get', path: '/test/something', params: {} }, { output: { context: 2 } }, { isSegway: true }, jasmine.any(Function))
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/test/something', params: {} }, { output: { context: 2 } }, { isSegway: false }, jasmine.any(Function))
        expect(badcb).not.toHaveBeenCalled()
      })
    })

    it('should route for parameter route', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) },
        nonroutecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb = spyOn(fn, 'nonroutecb').and.callThrough()

      x1.register('GET', '/path/before', nonroutecb)
      x1.register('GET', '/path/{to}', routecb)

      const req = { method: 'GET', path: '/path/for' }
      const res = { output: { context: 2 } }
      x1.route(req, res, () => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/path/for', params: { to: 'for' } }, { output: { context: 2 } }, { isSegway: false }, jasmine.any(Function))
        expect(nonroutecb).not.toHaveBeenCalled()
      })
    })

    it('should not assign parameter for specific route when defined', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) },
        nonroutecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb = spyOn(fn, 'nonroutecb').and.callThrough()

      x1.register('GET', '/path/{to}', nonroutecb)
      x1.register('GET', '/path/before', routecb)

      const req = { method: 'GET', path: '/path/before' }
      const res = { output: { context: 2 } }
      x1.route(req, res, () => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/path/before', params: { } }, { output: { context: 2 } }, { isSegway: false }, jasmine.any(Function))
        expect(nonroutecb).not.toHaveBeenCalled()
      })
    })

    it('should route for wildcard route but not generic segway', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) },
        nonroutecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb = spyOn(fn, 'nonroutecb').and.callThrough()

      x1.register('GET', '/path/before', nonroutecb)
      x1.register('GET', '/path/*/something', routecb)

      const req = { method: 'GET', path: '/path/crazy/something' }
      const res = { output: { context: 2 } }
      x1.route(req, res, () => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/path/crazy/something', params: { } }, { output: { context: 2 } }, { isSegway: false }, jasmine.any(Function))
        expect(nonroutecb).not.toHaveBeenCalled()
      })
    })

    it('should route for complex route', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret(null) },
        nonroutecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb = spyOn(fn, 'nonroutecb').and.callThrough()

      x1.register('GET', '/path/{testparam}/*/something', routecb)
      x1.register('GET', '/path/before', nonroutecb)

      const req = { method: 'GET', path: '/path/optionone/random/something/crazy/else' }
      const res = { output: { context: 1 } }
      x1.route(req, res, () => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/path/optionone/random/something/crazy/else', params: { testparam: 'optionone' } }, { output: { context: 1 } }, { isSegway: true }, jasmine.any(Function))
        expect(nonroutecb).not.toHaveBeenCalled()
      })
    })

    it('should route for simple route and return an error from that route', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret('ERROR!') },
        nonroutecb1: (req, res, item, ret) => { ret(null) },
        nonroutecb2: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb1 = spyOn(fn, 'nonroutecb1').and.callThrough()
      const nonroutecb2 = spyOn(fn, 'nonroutecb2').and.callThrough()

      x1.register('GET', '/path/to/something/else', nonroutecb1)
      x1.register('GET', '/path/to/something', routecb)
      x1.register('GET', '/path/to/different', nonroutecb2)

      const req = { method: 'GET', path: '/path/to/something' }
      const res = { output: { context: 1 } }
      x1.route(req, res, (err) => {
        expect(routecb).toHaveBeenCalledWith({ method: 'get', path: '/path/to/something', params: {} }, { output: { context: 1 } }, { isSegway: false }, jasmine.any(Function))
        expect(nonroutecb1).not.toHaveBeenCalled()
        expect(nonroutecb2).not.toHaveBeenCalled()
        expect(err).toEqual('ERROR!')
      })
    })

    it('should stop processing on segway error', () => {
      const x1 = new Router()

      const fn = {
        segway: (req, res, item, ret) => { ret('SEGWAY_ERROR') },
        routecb: (req, res, item, ret) => { ret(null) }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const segway = spyOn(fn, 'segway').and.callThrough()

      x1.register('GET', '/', segway)
      x1.register('GET', '/something', routecb)

      const req = { method: 'GET', path: '/something' }
      const res = { output: { context: 1 } }
      x1.route(req, res, (err) => {
        expect(segway).toHaveBeenCalledWith({ method: 'get', path: '/something', params: {} }, { output: { context: 1 } }, { isSegway: true }, jasmine.any(Function))
        expect(routecb).not.toHaveBeenCalled()
        expect(err).toEqual('SEGWAY_ERROR')
      })
    })

    it('should NOT_FOUND on undefined route when other route verbs are defined', () => {
      const x1 = new Router()

      const fn = {
        routecb: (req, res, item, ret) => { ret() },
        nonroutecb: (req, res, item, ret) => { ret() }
      }

      const routecb = spyOn(fn, 'routecb').and.callThrough()
      const nonroutecb = spyOn(fn, 'nonroutecb').and.callThrough()

      x1.register('POST', '/v1/session', routecb)
      x1.register('PATCH', '/v1/session/{id}', nonroutecb)

      const req = { method: 'POST', path: '/v1/session/test' }
      const res = { output: { context: 1 } }
      x1.route(req, res, (err) => {
        expect(routecb).toHaveBeenCalledWith({ method: 'post', path: '/v1/session/test', params: { id: 'test' } }, { output: { context: 1 } }, { isSegway: true }, jasmine.any(Function))
        expect(err).toEqual('NOT_FOUND')
      })
    })
  })
})
