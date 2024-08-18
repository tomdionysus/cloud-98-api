const APIServer = require('../lib/APIServer')
const RouterMock = requireMock('RouterMock')

describe('APIServer', () => {
  let router

  beforeEach(() => {
    router = new RouterMock()
  })

  it('should allow New', () => {
    const x1 = new APIServer({ router: router })
    const x2 = new APIServer({ router: router })

    expect(x1).not.toBe(x2)
  })

  describe('API version', () => {
    it('should register api version', () => {
      const x1 = new APIServer({ router: router })
      x1.registerVersion('1')

      expect(x1.baseUrl).toEqual('/v1')
    })
    it('should allow changing api version', () => {
      const x1 = new APIServer({ router: router })
      x1.registerVersion('1')
      x1.registerVersion('2')
      expect(x1.baseUrl).toEqual('/v2')
      x1.registerVersion('1')
      expect(x1.baseUrl).toEqual('/v1')
    })
  })

  describe('HTTPS redirect', () => {
    it('should call next on https request', () => {
      const x1 = new APIServer({ router: router })
      const cb = { f: () => {} }
      const req = {
        get: () => {
          return 'https'
        }
      }
      spyOn(cb, 'f')
      x1.httpsRedirect(req, {}, cb.f)

      expect(cb.f).toHaveBeenCalled()
    })

    it('should redirect on http request', () => {
      const x1 = new APIServer({ router: router })
      const cb = { f: () => {} }
      const req = {
        get: () => { return 'http' }
      }
      const res = {
        redirect: () => {}
      }
      spyOn(cb, 'f')
      spyOn(res, 'redirect')
      spyOn(x1, 'logRequest')
      x1.httpsRedirect(req, res, cb.f)

      expect(cb.f).not.toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalled()
      expect(x1.logRequest).toHaveBeenCalledWith(req, res)
    })
  })

  describe('registerOpenAPI', () => {
    it('registerOpenAPI should call jsonRestCrud.registerOpenAPI correctly', () => {
      const x1 = new APIServer({
        baseUrl: '/v1/',
        jsonRestCrud: {
          registerOpenAPI: () => {},
          registerApiServer: () => {},
          registerAfterHook: () => {},
        },
        router: router
      })
      spyOn(x1.jsonRestCrud, 'registerOpenAPI')

      x1.registerOpenAPI('openapi')

      expect(x1.jsonRestCrud.registerOpenAPI).toHaveBeenCalledWith('/v1/openapi', true)
    })
  })

  describe('statusXXXEnd', () => {
    it('status400End should call statusEnd correctly', () => {
      const x1 = new APIServer({ router: router })
      spyOn(x1, 'statusEnd')
      const res = {}; const errs = ['ERROR']
      x1.status400End(res, errs)
      expect(x1.statusEnd).toHaveBeenCalledWith(res, 400, 'BAD_REQUEST', 'Request badly formated', { errors: errs })
    })

    it('status401End should call statusEnd correctly', () => {
      const x1 = new APIServer({ router: router })
      spyOn(x1, 'statusEnd')
      const res = {}; const errs = ['ERROR']
      x1.status401End(res, errs)
      expect(x1.statusEnd).toHaveBeenCalledWith(res, 401, 'UNAUTHORISED', 'User not authorised', { errors: errs })
    })

    it('status403End should call statusEnd correctly', () => {
      const x1 = new APIServer({ router: router })
      spyOn(x1, 'statusEnd')
      const res = {}; const errs = ['ERROR']
      x1.status403End(res, errs)
      expect(x1.statusEnd).toHaveBeenCalledWith(res, 403, 'FORBIDDEN', 'The user is not authorised to perform the requested action', { errors: errs })
    })

    it('status404End should call statusEnd correctly', () => {
      const x1 = new APIServer({ router: router })
      spyOn(x1, 'statusEnd')
      const res = {}; const errs = ['ERROR']
      x1.status404End(res, errs)
      expect(x1.statusEnd).toHaveBeenCalledWith(res, 404, 'NOT_FOUND', 'The requested resource was not found', { errors: errs })
    })

    it('status422End should call statusEnd correctly', () => {
      const x1 = new APIServer({ router: router })
      spyOn(x1, 'statusEnd')
      const res = {}; const errs = ['ERROR']
      x1.status422End(res, errs)
      expect(x1.statusEnd).toHaveBeenCalledWith(res, 422, 'UNPROCESSABLE_ENTITY', 'One or more failures occured', { errors: errs })
    })

    it('status500End should call statusEnd correctly', () => {
      const x1 = new APIServer({ router: router })
      spyOn(x1, 'statusEnd')
      const res = {}; const errs = ['ERROR']
      x1.status500End(res, errs)
      expect(x1.statusEnd).toHaveBeenCalledWith(res, 500, 'UNKNOWN_ERROR', 'An unknown error occured', { errors: errs })
    })
  })
})
