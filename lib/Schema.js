const _ = require('underscore')
const path = require('path')
const fs = require('fs')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')
const Table = require('./Table')

class Schema {
  constructor (options) {
    options = options || {}
    this.logger = new ScopedLogger('Schema', options.logger || new Logger())

    this.options = options
    this.path = options.path || path.join(__dirname, '../server/schema')
    this.tables = {}
    this.relations = {}
    this.default = options.default || 'InnoDB'
    this.defaultCharset = options.defaultCharset || 'utf8mb4'
    this.defaultCollate = options.defaultCollate || 'utf8mb4_unicode_ci'
  }

  load () {
    const files = fs.readdirSync(this.path)
    for (const i in files) {
      const file = files[i]
      const fullPath = path.join(this.path, file)
      const basename = path.basename(file, '.js')
      const stats = fs.statSync(fullPath)
      if (!stats.isDirectory()) {
        this.logger.debug('Loading Table `%s`', basename)
        this.tables[basename] = require(fullPath)(Table)
      }
    }
  }

  // Init resolves relations, dependencies and links.
  init () {
    for (const i in this.tables) {
      this.tables[i].schema = this
      this.tables[i].init()
    }
  }

  addTable (table) {
    this.tables[table.name] = table
  }

  get (name) {
    return this.tables[name]
  }

  getSqlCreate () {
    let sql = ''
    for (const name in this.tables) {
      sql += '\n\n' + this.tables[name].getSqlCreate()
    }
    return sql.trim()
  }

  getScopes (table, scopes) {
    const where = []; const params = []
    for (const i in table.scopes) {
      if (!(i in scopes)) continue
      where.push('(?? = ?)')
      params.push(table.name + '.' + i)
      params.push(scopes[i])
    }
    return { where: where, params: params }
  }

  // Tables - array of table names. The first table in this array is the 'default' table.
  parseUrlQuery (quo, tables, options) {
    options = _.extend({
      allowFieldQuery: true,
      allowEmbed: true,
      allowLimit: true,
      allowSort: true
    }, options)

    const query = { where: [], params: [], limit: [], order: [], errors: [], embed: {}, extra: {} }

    if (!Array.isArray(tables) || tables.length < 1) {
      throw new Error('parseUrlQuery: Tables not supplied')
    }

    const tableo = {}
    for (const i in tables) {
      if (!this.tables[tables[i]]) {
        throw new Error('parseUrlQuery: Unknown table `' + tables[i] + '`')
      }
      tableo[i] = this.tables[tables[i]]
    }

    for (const key in quo) {
      const val = quo[key]
      const keyseg = key.split('.')

      // Valid?
      if (key.length === 0 || keyseg.length < 1 || keyseg.length > 3) {
        query.errors.push({ code: 'INVALID_FILTER', message: 'The filter is invalid', ref: key })
        continue
      }

      let table = this.tables[tables[0]]
      let limval, embval, sorts

      // Bare operation
      if (keyseg.length === 1 && keyseg[0].substr(0, 1) === '_') {
        switch (keyseg[0]) {
          case '_limit':
            if (!options.allowLimit) {
              query.errors.push({ code: 'LIMIT_NOT_ALLOWED', message: 'You cannot use a _limit operation on this request.' })
              continue
            }
            if (!_.isString(val) || !val.match(/^[0-9]+(\,[0-9]+)?$/i)) {
              query.errors.push({ code: 'CANNOT_PARSE_LIMIT', message: 'The limit clause cannot be parsed', ref: val })
              continue
            }
            query.limit = val.split(',')
            break
          case '_embed':
            if (!options.allowEmbed) {
              query.errors.push({ code: 'EMBED_NOT_ALLOWED', message: 'You cannot use a _embed operation on this request.' })
              continue
            }
            if (!_.isString(val)) {
              query.errors.push({ code: 'CANNOT_PARSE_EMBED', message: 'The embed clause cannot be parsed', ref: val })
              continue
            }
            embval = val.split(',')
            if (embval.length === 0 || embval[0].length === 0) {
              query.errors.push({ code: 'CANNOT_PARSE_EMBED', message: 'The embed clause cannot be parsed', ref: val })
              continue
            }
            // Ensure relations exist
            for (let i = 0; i < embval.length; i++) {
              if (embval[i] === '_definitions') {
                query.definitions = true
                continue
              }
              const relation = table.relations[embval[i]]
              if (!relation) {
                query.errors.push({ code: 'RESOURCE_CANNOT_BE_EMBEDDED', message: 'The specified resource cannot be embedded', ref: tables[0] + '.' + embval[i] })
                continue
              }

              query.embed[embval[i]] = relation.getSqlComponents()
            }
            break
          case '_sort':
            if (!options.allowSort) {
              query.errors.push({ code: 'SORT_NOT_ALLOWED', message: 'You cannot use a _sort operation on this request.' })
              continue
            }
            if (!_.isString(val)) {
              query.errors.push({ code: 'CANNOT_PARSE_SORT', message: 'The sort clause cannot be parsed', ref: val })
              continue
            }
            sorts = val.split(',')
            if (sorts.length === 0 || sorts[0].length === 0) {
              query.errors.push({ code: 'CANNOT_PARSE_SORT', message: 'The sort clause cannot be parsed', ref: val })
              continue
            }
            for (let i = 0; i < sorts.length; i++) {
              let sort = sorts[i].trim()
              let dirsql = null
              if (sort.indexOf('.') > 0) {
                const dir = sort.split('.')
                const dirop = dir.pop()
                switch (dirop) {
                  case '_asc':
                    dirsql = ' ASC'
                    break
                  case '_desc':
                    dirsql = ' DESC'
                    break
                  default:
                    query.errors.push({ code: 'CANNOT_PARSE_SORT', message: 'The sort clause cannot be parsed', ref: val })
                    continue
                }
                sort = dir.join('.')
              }
              const field = table.fields[sort]
              if (!field) {
                query.errors.push({ code: 'UNKNOWN_FIELD', message: 'The field to be sorted by does not exist', ref: sort })
                continue
              }
              query.order.push(field.getQualifiedSQLName() + (dirsql !== null ? dirsql : ''))
            }
            break
          default:
            query.errors.push({ code: 'NO_SUCH_OPERATION', message: 'The operation does not exist', ref: keyseg[0] })
            continue
        }
        continue
      }

      // Field queries allowed?
      if (!options.allowFieldQuery) {
        query.errors.push({ code: 'FIELD_QUERY_NOT_ALLOWED', message: 'You cannot use a field query on this request.', ref: table.name + '.' + keyseg[0] })
        continue
      }

      // Default Operation
      let op = '_eq'

      // Detect Operation
      if (keyseg.length > 1 && keyseg[keyseg.length - 1].substr(0, 1) === '_') {
        op = keyseg.pop()
      }

      // Get Table
      if (keyseg.length > 1) {
        const tableName = keyseg.shift()
        table = this.tables[tableName]
        if (!table) {
          query.errors.push({ code: 'UNKNOWN_ENTITY', message: 'The filter contains an unknown entity', ref: tableName })
          continue
        }
      }

      // Field Exists?
      if (!table.getField(keyseg[0])) {
        query.errors.push({ code: 'UNKNOWN_FIELD', message: 'There is no such field on the entity', ref: table.name + '.' + keyseg[0] })
        continue
      }

      const field = table.name + '.' + keyseg.join('.')
      switch (op) {
        case '_eq':
          query.where.push('(?? = ?)')
          query.params.push(field)
          query.params.push(val)
          break
        case '_neq':
          query.where.push('(?? <> ?)')
          query.params.push(field)
          query.params.push(val)
          break
        case '_gt':
          query.where.push('(?? > ?)')
          query.params.push(field)
          query.params.push(val)
          break
        case '_gte':
          query.where.push('(?? >= ?)')
          query.params.push(field)
          query.params.push(val)
          break
        case '_lt':
          query.where.push('(?? < ?)')
          query.params.push(field)
          query.params.push(val)
          break
        case '_lte':
          query.where.push('(?? <= ?)')
          query.params.push(field)
          query.params.push(val)
          break
        case '_like':
          query.where.push('(?? LIKE ?)')
          query.params.push(field)
          query.params.push(val)
          break
        case '_nlike':
          query.where.push('(NOT (?? LIKE ?))')
          query.params.push(field)
          query.params.push(val)
          break
        case '_null':
          query.where.push('(?? IS NULL)')
          query.params.push(field)
          break
        case '_notnull':
          query.where.push('(?? IS NOT NULL)')
          query.params.push(field)
          break
        default:
          query.errors.push({ code: 'NO_SUCH_OPERATION', message: 'The operation does not exist', ref: key })
      }
    }

    return query
  }
}

module.exports = Schema
