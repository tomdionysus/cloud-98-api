const express = require('express')
const fs = require('fs')
const path = require('path')
const _ = require('underscore')
const compression = require('compression')
const Busboy = require('busboy')
const tmp = require('tmp')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

const moment = require('moment')

class APIServer {
  constructor (options) {
    options = options || {}

    this.port = options.port || 8080
    this.env = options.env || 'prod'

    // IoC depedencies
    this.logger = new ScopedLogger('HTTP', options.logger || new Logger())
    this.session = options.session || null
    this.login = options.login || null
    this.mysql = options.mysql || null
    this.email = options.email || null
    this.invoicing = options.invoicing || null
    this.validator = options.validator || null
    this.rateLimiter = options.rateLimiter || null
    this.jsonRestCrud = options.jsonRestCrud || null
    this.oauth2 = options.oauth2 || null
    this.schema = options.schema || null
    this.router = options.router || null
    this.pdf = options.pdf || null
    this.signup = options.signup || null
    this.device = options.device || null
    this.currency = options.currency || null
    this.presenter = options.presenter || null
    this.kvstore = options.kvstore || null
    this.baseUrl = options.baseUrl || null
    this.stripe = options.stripe || null
    this.verifier = options.verifier || null
    this.s3storage = options.s3storage || null
    this.stripeWebhookSigningSecret = options.stripeWebhookSigningSecret || null
    this.stripePriceId = options.stripePriceId || null

    // Views & Controllers
    this.mvc = {}

    // The main HTTP APIServer
    this.app = express()
    this.app.disable('x-powered-by')
    this.app.set('etag', false)

    // No Caching/ETag, ever
    this.app.use((req, res, next) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')
      res.set('Surrogate-Control', 'no-store')
      next()
    })
    this.app.set('etag',false)

    // Public healthcheck route for Load Balancer
    this.app.get('/healthcheck', (req, res) => { res.status(200).end() })

    // In production, redirect HTTP to HTTPS
    if (this.env === 'prod') {
      this.app.use((req, res, next) => { this.httpsRedirect(req, res, next) })
    }

    // Patch for output
    this.app.use((req, res, next) => {
      req.startTime = new Date()
      res.originalRequest = req
      next()
    })

    // Rate Limiter
    if (this.rateLimiter) {
      this.rateLimiter.register((req, res) => {
        this.status420End(res, [{ code: 'IP_RATE_LIMIT_EXCEEDED', message: 'IP Rate Limit Exceeded' }])
      })
      this.app.use(this.rateLimiter.express)
      this.logger.debug("Rate Limiting set for all routes "+this.rateLimiter.rpm+'req/min')
    }

    // Robots.txt
    this.app.use('/robots.txt', this.robotsTxt.bind(this))

    // CORS
    this.app.use((req, res, next) => {
      if(req.headers.origin) {
        res.set('Access-Control-Allow-Origin', req.headers.origin)
        res.set('Vary', 'Origin')
      } else {
        res.set('Access-Control-Allow-Methods', '*')
      }
      res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PATCH, DELETE')
      res.set('Access-Control-Allow-Headers', 'Authorization, Accept, Content-Type')
      next()
    })

    // CORS Options
    this.router.register('OPTIONS', '/', (req, res, info, next) => { this.statusEnd(res, 200, 'OK', '', {}) })

    // Body Parser for forms/json
    this.app.use(this.JSONParser.bind(this))

    // Scopes
    this.app.use(this.scopesInit.bind(this))

    // Compression
    this.app.use(compression())

    // Register this to crud
    if (this.jsonRestCrud) {
      this.jsonRestCrud.registerApiServer(this)
      this.jsonRestCrud.registerAfterHook(this.afterJSONRestCrud.bind(this))
    }
  }

  afterJSONRestCrud(tx, operation, entity, id, data, extra, req, cb) {
    // Ignore GET
    if(['get','getAll'].indexOf(operation)!==-1) return cb()

    // Map CRUD events to system event types
    const evtMap = {
      create: 'created',
      update: 'updated',
      updateAll: 'updated.bulk',
      delete: 'deleted',
      deleteAll: 'deleted.bulk',
    }

    var eventData = {}
    eventData[entity] = { ...data }
    if(id) eventData[entity].id = id

    this.systemEvent(tx, req.session?.user?.id, req.session?.organisation?.id, entity+'.'+evtMap[operation], eventData, cb)
  }

  start () {
    // Final Processing after all controllers have run
    const doOutput = (err, req, res, check, next) => {
      res.endTime = new Date()
      if (err === 'NOT_FOUND') {
        if (!check) { return next() }
        return this.status404End(res)
      }
      if (!res.statusCode) { res.status(200) }
      switch (req.headers.accept) {
        case 'application/json':
          res.set('content-type', 'application/json')
          res.send(JSON.stringify(res.json))
          res.end()
          break
        default:
          this.statusEnd(res, 416, 'NOT_ACCEPTABLE', 'Not Acceptable')
      }
      this.logRequest(req, res)
    }

    // Session Loader
    this.app.use(this.sessionLoader.bind(this))

    // Router
    this.app.use((req, res, next) => {
      res.json = {}
      this.router.route(req, res, (err) => { doOutput(err, req, res, true, next) })
    })

    // Catch All Error Handler
    this.app.use((err, req, res) => {
      this.logger.error('Exception: ' + err + ': ' + err.stack)
      this.status500End(res)
    })

    // Log APIServer start
    this.app.listen(this.port, () => {
      this.logger.info('APIServer listening on port %d', this.port)
    })
  }

  outputCSV (res) {
    if (!res.primaryEntity) return this.status406End(res)

    res.set('content-type', 'text/csv')
    const header = []; const fields = []; const data = res.json[res.primaryEntity]

    if (data.length === 0) {
      res.send('').end()
      return
    }

    let out = ''; let f; let row; let i; let dt

    // Headers
    for (f in data[0]) { fields.push(f); header.push(this.escapeCSV(f)) }
    out += header.join(',') + '\r\n'

    // Data
    for (i in data) {
      row = data[i]
      dt = []
      for (f in fields) {
        dt.push(this.escapeCSV(row[fields[f]]))
      }
      out += dt.join(',') + '\r\n'
    }

    res.send(out).end()
  }

  escapeCSV (str) {
    const csvcheck = /.*[,\\n"].*/
    if (str === null || str === undefined) return ''
    if (str === '') return '""'
    str = str.toString()
    if (csvcheck.test(str)) str = '"' + str.replace('"', '\\"') + '"'
    return str
  }

  registerOpenAPI (route) {
    this.jsonRestCrud.registerOpenAPI(this.baseUrl + route, true)
  }

  registerVersion (version) {
    this.baseUrl = '/v' + version + ''
  }

  register (verb, route, fileName, options = { public: false, segway: false }) {
    if (this.baseUrl) { route = this.baseUrl + route }

    if (!fileName) {
      fileName = route
      while (fileName[0] === '/') { fileName = fileName.substr(1) }
    }
    const controllerFile = path.join(__dirname, '../server/controller/' + fileName)

    this.mvc[route] = {}
    if (fs.existsSync(controllerFile + '.js')) {
      this.mvc[route].controller = require(controllerFile)
    }
    this.logger.debug('Registering Route ' + verb + ' ' + route+ ' '+JSON.stringify(options))

    // Add the route
    this.router.register(verb, route, (req, res, info, next) => {
      if (!options.segway && info.isSegway) return next()
      if (!options.public && !req.session) return this.status401End(res)

      const rt = this.mvc[route]
      const method = req.method.toLowerCase()

      if (!rt) return this.status401End(res)
      if (!rt.controller) {
        this.logger.error('ROUTING ERROR: ' + (options.public ? 'Public ' : '') + 'Route ' + verb + ' ' + route + ' Specifies missing Controller "' + fileName + '"')
        return this.status500End(res)
      }
      if (!rt.controller[method]) return this.status405End(res)
      rt.controller[method].call(this, req, res, next)
    })
  }

  registerCRUD (route, tableName, crudString, options = { public: false }) {
    if (this.baseUrl) { route = this.baseUrl + route }

    this.logger.debug('Registering ' + crudString + ' ' + route + ' '+JSON.stringify(options))

    this.jsonRestCrud.registerCRUD(route, tableName, crudString, options)
  }

  /*
     * Register a request scope from a route parameter
     * This will copy the value of the specified route parameter into the specified request scope
     * @param {string} route - The route in /route/{param_id} format
     * @param {string} paramName - The route parameter name
     * @param {string} scopeName - The request scope name
     */
  registerParameterScope (route, paramName, scopeName) {
    if (this.baseUrl) { route = this.baseUrl + route }
    scopeName = scopeName || paramName
    this.router.register('*', route, (req, res, info, next) => {
      req.scopes[scopeName] = req.params[paramName]
      this.logger.debug('registerParameterScope - Setting Scope %s = field %s, %s', scopeName, paramName, req.params[paramName])
      next()
    }, true)
  }

  /*
     * Register a custom scope on a route
     * This will copy the value of the specified route parameter into the specified request scope
     * @param {string} route - The route in /route/{param_id} format
     * @param {string} scopeName - The request scope name
     * @param {function} func - The function of form (req,res) which returns the scope value
     */
  registerCustomScope(route, scopeName, func) {
    if (this.baseUrl) { route = this.baseUrl + route }
    this.router.register('*', route, (req, res, info, next) => {
      var val = func(req,res)
      req.scopes[scopeName] = val
      this.logger.debug('registerCustomScope - Setting Scope %s = %s', scopeName, val)
      next()
    }, true)
  }

  /*
     * Register a request scope requirement for this route and all subroutes
     * This will return a 401 Unauthorized if the specified request scope is not defined
     * @param {string} route - The route in /route/{param_id} format
     * @param {string} scopeName - The request scope name
     */
  registerScopeMustBeSet (route, scopeName) {
    if (this.baseUrl) { route = this.baseUrl + route }
    this.router.register('*', route, (req, res, info, next) => {
      if (!req.scopes[scopeName]) {
        this.logger.debug('registerScopeMustBeSet - Denied, scope %s is not set', scopeName)
        return this.status401End(res)
      }
      this.logger.debug('registerScopeMustBeSet - Allowed, scope %s is set', scopeName)
      next()
    }, true)
  }

  registerClearScopes (route, scopeNames) {
    if (this.baseUrl) { route = this.baseUrl + route }
    this.router.register('*', route, (req, res, info, next) => {
      this.logger.debug('registerClearScopes - Clearing scopes %s', scopeNames.join(', '))
      for(var i in scopeNames) {
        delete req.scopes[scopeNames[i]]
      }
      next()
    }, true)
  }

  registerScopeCheckEntityExists (route, paramName, entityName, scopeName = paramName, entityIdFieldName = 'id', scopeParamName = scopeName) {
    if (this.baseUrl) { route = this.baseUrl + route }
    
    scopeName = scopeName || paramName
    scopeParamName = scopeParamName || entityIdFieldName || entityName + '_id'
    entityIdFieldName = entityIdFieldName || 'id'
    this.router.register('*', route, (req, res, info, next) => {
      req.scopes[scopeName] = req.params[paramName]

      // Setup Query, Where, Params
      let queryString = 'SELECT COUNT(*) AS c FROM ??'
      let where = ['(?? = ?)']
      let params = [entityName, entityName + '.' + entityIdFieldName, req.params[scopeParamName]]

      // Add Scopes
      const mainScope = this.schema.getScopes(entityName, req.scopes)
      where = where.concat(mainScope.where)
      params = params.concat(mainScope.params)

      // Where Clause
      if (where.length > 0) { queryString += ' WHERE ' + where.join(' AND ') }

      this.logger.debug('registerScopeCheckEntityExists - Check Entity %s to field %s, %s', scopeName, paramName, req.params[paramName])
      this.mysql.query(queryString, params, (err, result) => {
        if (err) { return this.status500End(res) }
        if (result[0].c === 0) { return this.status404End(res) }
        next()
      })
    }, true)
  }

  // Check that the user scope exists and matches the request scope with the following name
  registerScopeCheckUserScopeMatches (route, userScopeName, scopeName) {
    scopeName = scopeName || userScopeName

    if (this.baseUrl) { route = this.baseUrl + route }

    this.router.register('*', route, (req, res, info, next) => {
      if (!req.session) {
        this.logger.debug('registerScopeCheckUserScopeMatches - Denied %s, %s - no session', userScopeName, scopeName)
        return this.status401End(res)
      }
      if (!req.session.scopes[userScopeName] || req.session.scopes[userScopeName] !== req.scopes[scopeName]) {
        this.logger.debug('registerScopeCheckUserScopeMatches - Denied %s, %s, %s !== %s', userScopeName, scopeName, req.session.scopes[userScopeName], req.scopes[scopeName])
        return this.status403End(res)
      }
      this.logger.debug('registerScopeCheckUserScopeMatches - Allowed %s, %s, %s === %s', userScopeName, scopeName, req.session.scopes[userScopeName], req.scopes[scopeName])
      next()
    }, true)
  }

  /*
     * Have a route reject unauthorised users based on their organisation roles.
     * The route will return HTTP 401 if there is no session, HTTP 403 if the session user has no organisation or does not have one or more of the specified roles in the organisation
     * @param {string} route - The route in /route/{param_id} format
     * @param {string} crudString - The HTTP verbs to filter on represented by the characters 'CRUD' (C = POST, R = GET, U = PUT/PATCH, D = DELETE), or '*' for all operations
     * @param {array} roles - An array of string role names. To pass authorisation, the current session user must have at least one of these roles in the session user organisation
     */
  registerCheckHasAnyRole (route, crudString, roles) {
    if (this.baseUrl) { route = this.baseUrl + route }

    const handler = (req, res, info, next) => {
      if (!req.session) {
        this.logger.debug('registerCheckHasAnyRole - Denied %s - no session', route)
        return this.status401End(res)
      }
      if (!req.session.organisation) {
        this.logger.debug('registerCheckHasAnyRole - Denied %s - no organisation', route)
        return this.status403End(res, { code: 'NO_USER_ORGANISATION', message: 'The current user is not in the context of an organisation' })
      }
      if (!this.hasAnyRole(req, roles)) {
        this.logger.debug('registerCheckHasAnyRole - Denied %s - does not have any role in %s', route, roles)
        return this.status403End(res, { code: 'USER_DOES_NOT_HAVE_ROLE', message: 'The current user does not have a role in the current organisation context that can access this resource' })
      }
      this.logger.debug('registerCheckHasAnyRole - Allowed %s', route)
      next()
    }

    if (crudString === '*') crudString = 'CRUD'
    if (crudString.indexOf('C') !== -1) this.router.register('POST', route, handler)
    if (crudString.indexOf('R') !== -1) this.router.register('GET', route, handler)
    if (crudString.indexOf('U') !== -1) {
      this.router.register('PUT', route, handler)
      this.router.register('PATCH', route, handler)
    }
    if (crudString.indexOf('D') !== -1) {
      this.router.register('DELETE', route, handler)
    }
  }

  // HTTPS redirect middleware
  httpsRedirect (req, res, next) {
    const forwardedProto = req.get('x-forwarded-proto')
    if (forwardedProto && forwardedProto !== 'https') {
      res.redirect('https://' + req.hostname + req.originalUrl)
      this.logRequest(req, res)
    } else {
      next()
    }
  }

  // Initialise Scopes
  scopesInit (req, res, next) {
    req.scopes = {}
    next()
  }

  // Multipart Form/File parser middleware
  JSONParser (req, res, next) {
    if (['POST', 'PATCH'].indexOf(req.method) === -1) { return next() }
    let ct = req.get('content-type') || ''
    if (ct.indexOf(';') !== -1) ct = ct.substr(0, ct.indexOf(';'))

    let data = ''; let tmpFile; let busboy

    switch (ct) {
      case 'application/json':
        req.setEncoding('utf8')
        req.on('data', (chunk) => { data += chunk })

        req.on('end', () => {
          try {
            req.body = JSON.parse(data)
            req.rawBody = data
          } catch (e) {
            return this.status422End(res, [{ code: 'JSON_PARSE_FAILURE', message: 'The supplied JSON cannot be parsed', ref: '/' }])
          }
          next()
        })

        return
      case 'multipart/form-data':
      case 'application/x-www-form-urlencoded':
        req.body = {}
        busboy = new Busboy({ headers: req.headers, limits: { fileSize: this.uploadFileSizeLimit } })
        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
          tmpFile = tmp.fileSync()
          req.body[fieldname] = {
            filename: filename, encoding: encoding, mimetype: mimetype, stream: fs.createWriteStream(null, { fd: tmpFile.fd }), length: 0
          }
          file.on('data', (data) => {
            req.body[fieldname].length += data.length
            req.body[fieldname].stream.write(data)
          })
          file.on('end', () => {
            req.body[fieldname].stream.end()
            req.body[fieldname].stream = fs.createReadStream(tmpFile.name)
          })
        })
        busboy.on('field', (fieldname, val) => {
          req.body[fieldname] = val
        })
        busboy.on('finish', () => {
          next()
        })
        req.pipe(busboy)
        return
      default:
        this.statusEnd(res, 415, 'UNSUPPORTED_CONTENT_TYPE', 'Unsupported Content-Type', { ref: ct })
    }
  }

  logRequest (req, res) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    this.logger.info(ip + ' ' + req.method.toUpperCase() + ' ' + req.url + ' [' + res.statusCode + '] (' + (res.endTime - req.startTime) + 'ms)')
  }

  statusEnd (res, httpStatus, code, message, data, dolog = true) {
    data = data || {}
    res.set('content-type', 'application/json')
    res.status(httpStatus).send(JSON.stringify(_.extend(data, { code: code, message: message }))).end()
    res.endTime = new Date()
    if(dolog) this.logRequest(res.originalRequest, res)
  }

  status400End (res, errs = []) {
    this.statusEnd(res, 400, 'BAD_REQUEST', 'Request badly formated', { errors: errs })
  }

  status401End (res, errs = []) {
    this.statusEnd(res, 401, 'UNAUTHORISED', 'User not authorised', { errors: errs })
  }

  status402End (res, errs = []) {
    this.statusEnd(res, 402, 'PAYMENT_REQUIRED', 'The requested action payment failed', { errors: errs })
  }

  status403End (res, errs = []) {
    this.statusEnd(res, 403, 'FORBIDDEN', 'The user is not authorised to perform the requested action', { errors: errs })
  }

  status404End (res, errs = []) {
    this.statusEnd(res, 404, 'NOT_FOUND', 'The requested resource was not found', { errors: errs })
  }

  status405End (res, errs = []) {
    this.statusEnd(res, 405, 'METHOD_NOT_ALLOWED', 'The requested resource cannot be accessed with the specified method', { errors: errs })
  }

  status406End (res, errs = []) {
    this.statusEnd(res, 406, 'NOT_ACCEPTABLE', 'The requested resource cannot be used with the requested content negotiation headers', { errors: errs })
  }

  status409End (res, errs = []) {
    this.statusEnd(res, 409, 'CONFLICT', 'The requested resource cannot be created or modifed because of a conflict', { errors: errs })
  }

  status420End (res, errs = []) {
    this.statusEnd(res, 420, 'RATE_LIMIT_EXCEEDED', 'Enhance Your Calm', { errors: errs }, false)
  }

  status422End (res, errs = []) {
    this.statusEnd(res, 422, 'UNPROCESSABLE_ENTITY', 'One or more failures occured', { errors: errs })
  }

  status500End (res, errs = []) {
    this.statusEnd(res, 500, 'UNKNOWN_ERROR', 'An unknown error occured', { errors: errs })
  }

  // Session Loader middleware
  sessionLoader (req, res, next) {
    // Get Session ID
    let sessionId = req.get('authorization')
    if (sessionId && sessionId.substr(0, 6).toLowerCase() === 'bearer') sessionId = sessionId.substr(7).toLowerCase().trim()
    // Session is valid format?
    if (sessionId && sessionId.match(/^[0-9a-f]{32}$/i)) {
      // Get Session
      this.session.load(sessionId, (err, sessionid, data) => {
        if (err) { res.status(500).end(); return }
        if (data) {
          delete data.user.pwdsha256
          delete data.user.salt
          req.session = data
          req.session.id = sessionId
          req.session.scopes = req.session.scopes || {}

          req.session.scopes.user_id = req.session.user.id
          req.session.scopes.account_id = req.session.user.account_id
          req.session.scopes.organisation_id = (req.session.organisation ? req.session.organisation.id : undefined)

          req.scopes.user_id = req.session.scopes.user_id
          req.scopes.account_id = req.session.scopes.account_id
          req.scopes.organisation_id = req.session.scopes.organisation_id
        }
        next()
      })
      return
    }
    // No Session
    next()
  }

  systemEvent(tx, userId, organisationId, eventType, eventData, callback = ()=>{}) {
    var insertData = {
      id: this.mysql.bigid(),
      user_id: userId,
      organisation_id: organisationId,
      event_type: eventType,
      event_data: eventData,
      created_utc: moment().utc(),
    }

    this.schema.get('cloud98_event').insert(tx, insertData, callback)
  } 

  hasRole (req, role) {
    return req.session.organisation && !!req.session.organisation.roles[role]
  }

  hasAnyRole (req, roles) {
    if (!_.isArray(roles)) roles = [roles]
    for (let i = 0; i < roles.length; i++) {
      if (req.session.organisation.roles[roles[i]]) { return true }
    }
    return false
  }

  // authRoles checks if the current user has any of the specified roles, and redirects with an unauthorised message if not.
  authRoles (req, res, roles) {
    if (this.hasAnyRole(req, roles)) return true

    this.status403End(res)
    return false
  }

  updateSession (req, res, next) {
    this.session.save(req.session.id, req.session, 86400, (err) => {
      if (err) { return this.status500End(res, err) }
      next()
    })
  }

  robotsTxt (req, res) {
    res
      .set('content-type', 'text/plain')
      .status(200)
      .send('User-agent: *\nDisallow: /\n')
      .end()
  }

  genPassword(len = 8) {
      const abc = 'abcdefghjklmnpqrstuvwxyz1234567890'
      var pwd = ''
      for(var i=0; i<len; i++) { pwd += abc[Math.floor(Math.random()*abc.length)] }
      return pwd
  }
}

module.exports = APIServer
