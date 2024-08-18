const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')
const uuidv4 = require('uuid/v4')

const async = require('async')
const crypto = require('crypto')
const _ = require('underscore')

class JsonRestCrud {
  constructor (options) {
    options = options || {}
    this.options = options
    this.logger = new ScopedLogger('JsonRestCrud', options.logger || new Logger())
    this.schema = options.schema
    this.router = options.router
    this.mysql = options.mysql
    this.validator = options.validator
    this.presenter = options.presenter
    this.apiServer = options.apiServer
    this.tag = options.tag
    this.afterHook = options.afterHook || ((tx, operation, entity, id, data, extra, req, cb)=>{ cb() })

    this.idMode = options.idMode || 'bigint'

    // Tests ID Mode
    this._generateId()

    options.info = options.info || {}
    options.info.license = options.info.license || {}

    this.openApi = {
      openapi: '3.0.0',
      info: {
        title: options.info.title,
        description: options.info.description,
        termsOfService: options.info.termsOfService,
        version: options.info.version,
        license: {
          name: options.info.license.name,
          url: options.info.license.url
        }
      },
      paths: {},
      security: [],
      tags: [],
      externalDocs: {},
      components: {
        responses: {
          OK: { description: 'OK' },
          NOT_FOUND: { description: 'Not Authorized' },
          NOT_AUTHORIZED: { description: 'Forbidden' },
          FORBIDDEN: { description: 'Not Found' },
          UNPROCESSABLE_ENTITY: { description: 'Unprocessable Entity' }
        }
      }
    }
  }

  registerApiServer (apiServer) {
    this.apiServer = apiServer
  }

  registerCRUD (route, tableName, crudString, options = { public: false }) {
    const table = this.schema.get(tableName)
    if (!table) { throw new Error('registerCRUD: Table not found ' + tableName) }

    this.openApi.tags.push({
      name: table.name,
      description: table._description
    })

    if (crudString.indexOf('C') !== -1) { this.registerCreate(route, table, options) } 
    if (crudString.indexOf('I') !== -1) { this.registerRead(route, table, options) } 
    if (crudString.indexOf('R') !== -1) { this.registerReadAll(route, table, options) } 
    if (crudString.indexOf('U') !== -1) { this.registerUpdate(route, table, options) }
    if (crudString.indexOf('P') !== -1) { this.registerUpdateAll(route, table, options) }
    if (crudString.indexOf('D') !== -1) { this.registerDelete(route, table, options) }
    if (crudString.indexOf('X') !== -1) { this.registerDeleteAll(route, table, options) }
    if (crudString.indexOf('T') !== -1) { this.registerTag(route, table, options) }
  }

  register405 (verb, route) {
    this.router.register(verb, route, (req, res, route, next) => { if(route.isSegway) { next() } else { this.apiServer.status405End(res) } })
  }

  _defineOpenAPI (verb, route, table, options = { public: false }, schemaInput, schemaOutput) {
    verb = verb.toLowerCase()
    const x = this.openApi.paths
    x[route] = x[route] || {
      summary: 'The ' + table.name + ' resource',
      description: table.description
    }
    x[route][verb] = x[route][verb] || {}
    x[route][verb] = {
      tags: [table.name],
      consumes: [],
      produces: [],
      parameters: [],
      responses: { }
    }

    // Add schema for input if required
    if (schemaInput) {
      x[route][verb].parameters.push({
        in: 'body',
        name: 'body',
        description: table.name,
        required: true,
        schema: {
          $ref: '#/components/schemas/' + table.name
        }
      })
      x[route][verb].responses['422'] = { $ref: '#/components/responses/UNPROCESSABLE_ENTITY' }
      x[route][verb].produces = ['application/json']
    }

    // Add Responses for output/status only
    if (schemaOutput) {
      x[route][verb].responses['200'] = { description: table.name + ' response', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/' + table.name } } } } }
      x[route][verb].responses['404'] = { $ref: '#/components/responses/NOT_FOUND' }
      x[route][verb].consumes = ['application/json']
    } else {
      x[route][verb].responses['200'] = { description: 'Operation Status', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/status' } } } } }
    }

    // Add Responses for Auth route
    if (!options.public) {
      x[route][verb].responses['403'] = { $ref: '#/components/responses/NOT_AUTHORIZED' }
      x[route][verb].responses['401'] = { $ref: '#/components/responses/FORBIDDEN' }
    }

    // Add Path Parameters
    const params = route.match(/\{[^}]+\}/ig)
    if (params) {
      for (let i = 0; i < params.length; i++) {
        const param = params[i].substr(1, params[i].length - 2)

        x[route][verb].parameters.push({
          in: 'path',
          name: param,
          required: true,
          schema: { $ref: '#/components/schemas/uuid' },
          description: 'The ' + param + ' for the request'
        })
      }
    }
  }

  registerReadAll (route, table, options = {}) {
    this.logger.debug('Register Read All %s [%s]', route, table.name)

    this._defineOpenAPI('GET', route, table, options, false, true)

    this.router.register('GET', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      this.logger.debug('Read All Entity %s', table.name)
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._getAll(req, res, table, options, next)
    })
  }

  registerCreate (route, table, options = {}) {
    this.logger.debug('Register Create %s [%s]', route, table.name)

    this._defineOpenAPI('POST', route, table, options, true, false)

    this.router.register('POST', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      this.logger.debug('Create Entity %s', table.name)
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._create(req, res, table, options, next)
    })
  }

  registerRead (route, table, options = {}) {
    route = route + '/{' + table.name + '_id}'

    this.logger.debug('Register Read %s [%s]', route, table.name)

    this._defineOpenAPI('GET', route, table, options, false, true)

    this.router.register('GET', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      this.logger.debug('Read Individual Entity %s ID %s', table.name, req.params[table.name + '_id'])
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._get(req, res, table, options, next)
    })
  }

  registerDelete (route, table, options = {}) {
    route = route + '/{' + table.name + '_id}'

    this.logger.debug('Register Delete %s [%s]', route, table.name)

    this._defineOpenAPI('DELETE', route, table, options, false, false)

    this.router.register('DELETE', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      this.logger.debug('Delete Entity %s ID %s', table.name, req.params[table.name + '_id'])
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._delete(req, res, table, options, next)
    })
  }

  registerDeleteAll (route, table, options = {}) {
    this.logger.debug('Register Delete All %s [%s]', route, table.name)

    this._defineOpenAPI('DELETE', route, table, options, false, false)

    this.router.register('DELETE', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      this.logger.debug('Delete All Entity %s', table.name)
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._deleteAll(req, res, table, options, next)
    })
  }

  registerUpdate (route, table, options = {}) {
    route = route + '/{' + table.name + '_id}'

    this.logger.debug('Register Update %s [%s]', route, table.name)

    this._defineOpenAPI('PATCH', route, table, options, true, false)

    this.router.register('PATCH', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      this.logger.debug('Update Entity %s ID %s', table.name, req.params[table.name + '_id'])
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._update(req, res, table, options, next)
    })
  }

  registerUpdateAll (route, table, options = {}) {
    this.logger.debug('Register Update All %s [%s]', route, table.name)

    this._defineOpenAPI('PATCH', route, table, options, true, false)

    this.router.register('PATCH', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      this.logger.debug('Update All Entity %s', table.name)
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._updateAll(req, res, table, options, next)
    })
  }

  registerOpenAPI (route, options = {}) {
    this.logger.debug('Register OpenAPI Document %s', route)

    this.router.register('GET', route, (req, res, item, next) => {
      if (item.isSegway) { return next() }
      if (!options.public && !req.session) { return this.apiServer.status401End(res) }

      this._openApi(req, res, options, next)
    })
  }

  /**
  * Register POST and DELETE route for table on route+'/tag'
  */
  registerTag (route, table, options = {}) {
    this._createTag(route, table, options)
    this._deleteTag(route, table, options)
  }

  registerAfterHook(fn) { this.afterHook = fn }

  _get (req, res, table, options = {}, next) {
    if(req.params[table.name + '_id']===undefined) { return this.apiServer.status404End(res) }

    // Setup Query, Where, Params
    let queryString = 'SELECT `' + table.name + '`.* FROM ??'
    let where = ['(?? = ?)']
    let params = [table.name, table.name + '.id', req.params[table.name + '_id']]

    res.primaryEntity = table.name

    const query = this.schema.parseUrlQuery(req.query, [table.name], { allowFieldQuery: false })
    if (query.errors.length > 0) { return this.apiServer.status400End(res, query.errors) }

    const ops = {}
    const results = {}

    // Add Scopes
    const mainScope = this.schema.getScopes(table, req.scopes)
    where = where.concat(mainScope.where)
    params = params.concat(mainScope.params)

    // Call custom handler if defined
    if (table.handlers.I && !table.handlers.I.call(this.apiServer, req, res, 'I', table, where, params)) { return this.apiServer.status500End(res) }

    // Where Clause
    if (where.length > 0) { queryString += ' WHERE ' + where.join(' AND ') }
    // Limit Clause
    if (query.limit > 0) { queryString += ' LIMIT ' + query.limit.join(', ') }
    // Main Operation
    ops[table.name] = { dataSet: table.name, queryString: queryString, params: params }

    // Embeds
    for (const tableName in query.embed) {
      const embed = query.embed[tableName]

      // Main entity query parameters
      embed.where = embed.where.concat(['(?? = ?)'])
      embed.params = embed.params.concat([table.name + '.id', req.params[table.name + '_id']])

      // Main Entity scopes
      embed.where = embed.where.concat(mainScope.where)
      embed.params = embed.params.concat(mainScope.params)

      // Any specific Scopes for embedded entity
      const scopes = this.schema.getScopes(this.schema.get(tableName), req.scopes)
      embed.where = embed.where.concat(scopes.where)
      embed.params = embed.params.concat(scopes.params)

      // Custom Handler for embedded table
      const emtable = this.schema.get(tableName)
      if (emtable.handlers.I && !emtable.handlers.I.call(this.apiServer, req, res, 'I', emtable, embed.where, embed.params)) continue

      queryString = 'SELECT DISTINCT `' + tableName + '`.* FROM ' + embed.tables.join(',') + ' WHERE ' + embed.where.join(' AND ')
      ops[tableName] = { dataSet: tableName, queryString: queryString, params: embed.params }
    }

    async.parallel([
      (cb) => {
        // Extras
        async.eachOf(query.extra, (extra, name, ecb) => {
          extra(this.apiServer, req, res, (err, data) => {
            if (err) return ecb(err)
            results[name] = data
            ecb()
          })
        }, cb)
      },
      (cb) => {
        // Do Queries
        async.each(ops, (op, ocb) => {
          this.mysql.query(op.queryString, op.params, (err, result) => {
            if (err) { return ocb(err) }
            // Custom Presenter?
            var presenterName = (options.presenters && options.presenters[op.dataSet]) ? options.presenters[op.dataSet] : op.dataSet
            results[op.dataSet] = this._present(result, presenterName)
            ocb(null)
          })
        }, cb)
      },
      (cb) => { this.afterHook(this.mysql, 'get', table.name, req.params[table.name + '_id'], null, query, req, cb) }
    ], (err) => {
      if (err) { return this.apiServer.status500End(res) }

      if (results[table.name].length === 0) {
        res.status(404)
        res.json = { code: 'NOT_FOUND', entity: table.name, ref: req.params[table.name + '_id'] }
      } else {
        res.status(200)
        res.json = { code: 'OK' }
        _.extend(res.json, results)
      }

      next()
    })
  }

  _getAll (req, res, table, options = {}, next) {
    // Setup Query, Where, Params
    let queryString = 'SELECT `' + table.name + '`.* FROM ??'
    let where = []
    let params = [table.name]

    res.primaryEntity = table.name

    // Query Params
    const query = this.schema.parseUrlQuery(req.query, [table.name])
    if (query.errors.length > 0) {
      this.apiServer.status400End(res, query.errors)
      return
    }
    where = where.concat(query.where)
    params = params.concat(query.params)

    const ops = {}
    const results = {}

    // Add Scopes
    const mainScope = this.schema.getScopes(table, req.scopes)
    where = where.concat(mainScope.where)
    params = params.concat(mainScope.params)

    // Call custom handler if defined
    if (table.handlers.R && !table.handlers.R.call(this.apiServer, req, res, 'R', table, where, params)) { return this.apiServer.status500End(res) }

    // Where Clause
    if (where && where.length > 0) { queryString += ' WHERE ' + where.join(' AND ') }
    // Order Clause
    if (query.order && query.order.length > 0) { queryString += ' ORDER BY ' + query.order.join(', ') }
    // Limit Clause
    if (query.limit && query.limit.length > 0) { queryString += ' LIMIT ' + query.limit.join(', ') }
    // Main Operation
    ops[table.name] = { dataSet: table.name, queryString: queryString, params: params }

    // Embeds
    for (const tableName in query.embed) {
      const embed = query.embed[tableName]

      // Main entity query parameters
      embed.where = embed.where.concat(query.where)
      embed.params = embed.params.concat(query.params)

      // Main Entity scopes
      embed.where = embed.where.concat(mainScope.where)
      embed.params = embed.params.concat(mainScope.params)

      // Any specific Scopes for embedded entity
      const scopes = this.schema.getScopes(this.schema.get(tableName), req.scopes)
      embed.where = embed.where.concat(scopes.where)
      embed.params = embed.params.concat(scopes.params)

      // Custom Handler for embedded table
      const emtable = this.schema.get(tableName)
      if (emtable.handlers.R && !emtable.handlers.R.call(this.apiServer, req, res, 'R', emtable, embed.where, embed.params)) continue

      queryString = 'SELECT DISTINCT `' + tableName + '`.* FROM ' + embed.tables.join(',') + ' WHERE ' + embed.where.join(' AND ')
      ops[tableName] = { dataSet: tableName, queryString: queryString, params: embed.params }
    }

    async.parallel([
      (cb) => {
        // Extras
        async.eachOf(query.extra, (extra, name, ecb) => {
          extra(this.apiServer, req, res, (err, data) => {
            if (err) return ecb(err)
            results[name] = data
            ecb()
          })
        }, cb)
      },
      (cb) => {
        // Do Queries
        async.each(ops, (op, opcb) => {
          this.mysql.query(op.queryString, op.params, (err, result) => {
            if (err) { return opcb(err) }
            // Custom presenter?
            var presenterName = (options.presenters && options.presenters[op.dataSet]) ? options.presenters[op.dataSet] : op.dataSet
            results[op.dataSet] = this._present(result, presenterName)
            if (query.definitions) {
              results._definitions = results._definitions || {}
              results._definitions[op.dataSet] = this._describe(op.dataSet)
            }
            opcb(null)
          })
        }, cb)
      },
      (cb) => { this.afterHook(this.mysql, 'get', table.name, null, null, query, req, cb) }
    ], (err) => {
      if (err) { return this.apiServer.status500End(res) }

      // Return Results
      res.status(200)
      res.json = { code: 'OK' }
      _.extend(res.json, results)
      next()
    })
  }

  _generateId () {
    switch (this.idMode) {
      case 'bigint':
        return BigInt('0x' + crypto.randomBytes(8).toString('hex')).toString()
      case 'uuid':
        return uuidv4()
      default:
        throw new Error('_generateId: Unknown ID Mode ' + this.idMode)
    }
  }

  _create (req, res, table, options = {}, next) {
    // Generate ID
    req.body.id = this._generateId()

    res.primaryEntity = table.name

    // Add Scopes
    for (const i in table.scopes) {
      if (!req.scopes[i]) continue
      req.body[i] = req.scopes[i]
    }

    // Validate
    const errs = this.validator.validate(req.body, table.name + '.post')
    if (errs.length > 0) {
      this.apiServer.status422End(res, errs)
      return
    }

    // Get Insert Data
    const data = table.getInsertData(req.body)
    const args = [table.name, data.fields, data.values]

    // Call custom handler if defined
    if (table.handlers.C && !table.handlers.C.call(this.apiServer, req, res, 'C', table, data, args)) { return this.apiServer.status500End(res) }

    // Do Insert
    this.mysql.asyncTransaction([
      (tr, cb) => { tr.query('INSERT INTO ?? (??) VALUES (?)', args, cb) },
      (tr, cb) => { this.afterHook(tr, 'create', table.name, req.body.id, req.body, null, req, cb) }
    ], (err) => {
      if (err) { return this.apiServer.status500End(res) }

      // Return Create Data
      res.status(201)
      res.json = { code: 'CREATED' }
      // Custom Presenter?
      var presenterName = (options.presenters && options.presenters[table.name]) ? options.presenters[table.name] : table.name
      res.json[table.name] = this._present([req.body], presenterName)
      next()
    })
  }

  _update (req, res, table, options = {}, next) {
    if(req.params[table.name + '_id']===undefined) { return this.apiServer.status404End(res) }

    // Setup Query, Where, Params
    let queryString = 'UPDATE ??'
    let where = []
    let params = [table.name]

    res.primaryEntity = table.name

    // Remove scoped data from body
    for (const i in table.scopes) {
      if (!req.scopes[i]) continue
      delete req.body[i]
    }

    // Query Params
    const query = this.schema.parseUrlQuery(req.query, [table.name])
    if (query.errors.length > 0) {
      this.apiServer.status400End(res, query.errors)
      return
    }
    where = where.concat(query.where)
    params = params.concat(query.params)

    // Validation
    const errs = this.validator.validate(req.body, table.name + '.patch')
    if (errs.length > 0) {
      this.apiServer.status422End(res, errs)
      return
    }

    // Update Data
    const data = table.getUpdateData(req.body)
    params = params.concat(data.values)

    // No data changed?
    if(data.assigns.length===0) {
      res.status(200)
      res.json = { code: 'ACCEPTED' }
      // Custom Presenter?
      var presenterName = (options.presenters && options.presenters[table.name]) ? options.presenters[table.name] : table.name
      res.json[table.name] = this._present([req.body], presenterName)
      return next()
    }

    // Add scopes to where
    for (const i in table.scopes) {
      if (!req.scopes[i]) continue
      req.body[i] = req.scopes[i]
      where.push('(?? = ?)')
      params.push(table.name + '.' + i)
      params.push(req.scopes[i])
    }

    // Final ID
    where.push('(?? = ?)')
    params.push(table.name + '.id', req.params[table.name + '_id'])

    // Call custom handler if defined
    if (table.handlers.U && !table.handlers.U.call(this.apiServer, req, res, 'U', table, where, params, data)) { return this.apiServer.status500End(res) }

    // Set Clauses
    if (data.assigns.length > 0) { queryString += ' SET ' + data.assigns.join(', ') }

    // Where Clause
    if (where.length > 0) { queryString += ' WHERE ' + where.join(' AND ') }

    // Do Update
    this.mysql.asyncTransaction([
      (tr, cb) => { tr.query(queryString, params, cb) },
      (tr, cb) => { this.afterHook(tr, 'update', table.name, req.params[table.name + '_id'], req.body, query, req, cb) }
    ], (err) => {
      if (err) { return this.apiServer.status500End(res) }

      // Return Update Data
      res.status(200)
      res.json = { code: 'ACCEPTED' }
      // Custom Presenter?
      var presenterName = (options.presenters && options.presenters[table.name]) ? options.presenters[table.name] : table.name
      res.json[table.name] = this._present([req.body], presenterName)
      next()
    })
  }

  _updateAll (req, res, table, options = {}, next) {
    // Cannot update Ids
    delete req.body.id

    // Setup Query, Where, Params
    let queryString = 'UPDATE ??'
    let where = []
    let params = [table.name]

    res.primaryEntity = table.name

    // Add Scopes
    for (const i in table.scopes) {
      if (!req.scopes[i]) continue
      req.body[i] = req.scopes[i]
      where.push('(?? = ?)')
      params.push(table.name + '.' + i)
      params.push(req.scopes[i])
    }

    // Validation
    const errs = this.validator.validate(req.body, table.name + '.patch')
    if (errs.length > 0) {
      this.apiServer.status422End(res, errs)
      return
    }

    const data = table.getUpdateData(req.body)
    params = params.concat(data.values)

    // Set Clauses
    if (data.assigns.length > 0) { queryString += ' SET ' + data.assigns.join(', ') }

    // Query Params
    const query = this.schema.parseUrlQuery(req.query, [table.name])
    if (query.errors.length > 0) {
      this.apiServer.status400End(res, query.errors)
      return
    }
    where = where.concat(query.where)
    params = params.concat(query.params)

    // Call custom handler if defined
    if (table.handlers.P && !table.handlers.P.call(this.apiServer, req, res, 'P', table, where, params, data)) { return this.apiServer.status500End(res) }

    // Where Clause
    if (where.length > 0) { queryString += ' WHERE ' + where.join(' AND ') }

    this.mysql.asyncTransaction([
      (tr, cb) => { tr.query(queryString, params, cb) },
      (tr, cb) => { this.afterHook(tr, 'updateAll', table.name, req.params[table.name + '_id'], req.body, query, req, cb) }
    ], (err, res) => {
      if (err) { return this.apiServer.status500End(res) }
      res = res[0]

      // Return Update Data
      res.status(201)
      res.json = { code: 'ACCEPTED' }
      res.json[table.name] = [ req.body ]
      next()
    })
  }

  _delete (req, res, table, options = {}, next) {
    if(req.params[table.name + '_id']===undefined) { return this.apiServer.status404End(res) }

    // Setup Query, Where, Params
    let queryString = 'DELETE FROM ??'
    const where = ['(?? = ?)']
    const params = [table.name, table.name + '.id', req.params[table.name + '_id']]

    res.primaryEntity = table.name

    // Set Scope Values
    for (const i in table.scopes) {
      if (!req.scopes[i]) continue
      where.push('(?? = ?)')
      params.push(table.name + '.' + i)
      params.push(req.scopes[i])
    }

    // Call custom handler if defined
    if (table.handlers.D && !table.handlers.D.call(this.apiServer, req, res, 'D', table, where, params)) { return this.apiServer.status500End(res) }

    // Where Clause
    if (where.length > 0) { queryString += ' WHERE ' + where.join(' AND ') }

    // Do Delete
    this.mysql.asyncTransaction([
      (tr, cb) => { tr.query(queryString, params, cb) },
      (tr, cb) => { this.afterHook(tr, 'delete', table.name, req.params[table.name + '_id'], null, null, req, cb) }
    ], (err) => {
      if (err) { return this.apiServer.status500End(res) }

      // Return OK
      res.status(202)
      res.json = { code: 'ACCEPTED' }
      next()
    })
  }

  _deleteAll (req, res, table, options = {}, next) {
    let queryString = 'DELETE FROM ??'
    const params = [table.name]
    const where = []

    res.primaryEntity = table.name

    // Set Scope Values
    for (const i in table.scopes) {
      if (!req.scopes[i]) continue
      where.push('(?? = ?)')
      params.push(table.name + '.' + i)
      params.push(req.scopes[i])
    }

    // Call custom handler if defined
    if (table.handlers.X && !table.handlers.X.call(this.apiServer, req, res, 'X', table, where, params)) { return this.apiServer.status500End(res) }

    // Where Clause
    if (where.length > 0) { queryString += ' WHERE ' + where.join(' AND ') }

    // Do DeleteAll
    this.mysql.asyncTransaction([
      (tr, cb) => { tr.query(queryString, params, cb) },
      (tr, cb) => { this.afterHook(tr, 'deleteAll', table.name, null, null, null, req, cb) }
    ], (err) => {
      if (err) { return this.apiServer.status500End(res) }

      // Return OK
      res.status(201)
      res.json = { code: 'ACCEPTED' }
      next()
    })
  }

  _present (data, presenterPath) {
    const pres = this.presenter.get(presenterPath)
    if (!pres) throw new Error('Presenter not defined for ' + presenterPath)

    const out = []
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      out.push(pres.present(row, presenterPath))
    }

    return out
  }

  _describe (presenterPath) {
    const presenter = this.presenter.get(presenterPath)
    return (presenter) ? { type: 'object', properties: presenter.describe() } : undefined
  }

  _openApi (req, res, next) {
    this.openApi.components.schemas = this.openApi.components.schemas || this.validator.openAPIComponents()

    this.openApi.components.schemas.status = {
      type: 'object',
      properties: {
        status: 'string'
      }
    }

    res.json = this.openApi
    next()
  }

  _createTag (route, table, options = {}) {
    this.router.register('POST', route + '/{' + table.name + '_id}/tag', (req, res, item, next) => {
      if (item.isSegway) return next()
      if (!options.public && !req.session) return this.apiServer.status401End(res)

      const entityType = table.name
      const entityId = req.params[table.name + '_id']
      const tag = req.body.tag

      this.mysql.query('INSERT INTO `tag` (`tag`, `entity_id`, `entity_type`) VALUES (?,?,?)', [tag, entityId, entityType], (err) => {
        if (err) return this.apiServer.status500End(res)

        res.status(201)
        res.json = {
          code: 'CREATED',
          tag: {
            tag: tag,
            entity_id: entityId,
            entity_type: entityType
          }
        }
        next()
      })
    })
  }

  _deleteTag (route, table, options = {}) {
    this.router.register('DELETE', route + '/{' + table.name + '_id}/tag/{tag}', (req, res, item, next) => {
      if (item.isSegway) return next()
      if (!options.public && !req.session) return this.apiServer.status401End(res)

      const entityType = table.name
      const entityId = req.params[table.name + '_id']
      const tag = req.params.tag

      this.mysql.query('DELETE FROM `tag` WHERE `tag`=? AND `entity_id`=? AND `entity_type`=?', [tag, entityId, entityType], (err) => {
        if (err) return this.apiServer.status500End(res)

        res.status(202)
        res.json = { code: 'DELETED' }
        next()
      })
    })
  }
}

module.exports = JsonRestCrud
