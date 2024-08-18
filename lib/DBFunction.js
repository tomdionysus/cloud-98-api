class DBFunction {
  constructor (name, params, schema, options = {}) {
    this.name = name
    this.schema = schema
    this._params = options.params
    this._returns = options.returns
    this._mode = options.mode || 'NO SQL'
    this._sql = options.sql
  }

  init () {
  }

  description (text) {
    this._description = text
  }

  params (params) {
    this._params = params
  }

  returns (type) {
    this._returns = type
  }

  mode (mode) {
    this._returns = mode
  }

  sql (sql) {
    this._sql = sql
  }

  getSqlCreate () {
    const p = []
    for (const i in this._params) {
      p.push(this._params[i].trim())
    }
    const sql = 'CREATE FUNCTION `' + this.name + '`(' + p.join(',') + ') RETURNS ' + this._returns + ' ' + this._mode + ' ' + this._sql + ';'

    return sql
  }
}

module.exports = DBFunction
