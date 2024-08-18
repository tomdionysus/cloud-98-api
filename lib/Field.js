const moment = require('moment')

class Field {
  constructor (name, type, length, nullable, options, table) {
    this.name = name
    this.type = type
    this._length = length
    this._nullable = typeof (nullable) !== 'undefined' ? nullable : true
    this._description = null
    this._unsigned = false // Number fields only
    this.table = table
    this.options = options || {}
  }

  getSqlCreate () {
    if (this.type === 'custom') return this.options.definition
    let sql = '`' + this.name + '` '
    sql += this.getSqlType() + ' '
    sql += (!this._nullable ? 'NOT ' : '') + 'NULL'
    if (this.options.default !== undefined) { sql += ' DEFAULT '+ (this.options.defaultIsLiteral ? this.options.default : '\'' + this.options.default + '\'') }
    if (this.options.primaryKey) { sql += ' PRIMARY KEY' }
    return sql
  }

  primaryKey () {
    this.options.primaryKey = true
    if(this.table) this.table.primaryKey = this
    return this
  }

  nullable (value = true) {
    this._nullable = !!value
    return this
  }

  unsigned (value = true) {
    this._unsigned = !!value
    return this
  }

  length (value) {
    this._length = value
    return this
  }

  default (value, isLiteral = false) {
    this.options.default = value
    this.options.defaultIsLiteral = isLiteral
    return this
  }

  defaultLiteral (value) {
    this.default(value, true)
    return this
  }

  description (value) {
    this._description = value
    return this
  }

  getQualifiedSQLName () {
    return '`' + this.table.name + '`.`' + this.name + '`'
  }

  getSqlType () {
    switch (this.type) {
      case 'uuid':
        return 'CHAR(36)'
      case 'tinyint':
        return 'TINYINT' + (this._unsigned ? ' UNSIGNED' : '')
      case 'smallint':
        return 'SMALLINT' + (this._unsigned ? ' UNSIGNED' : '')
      case 'mediumint':
        return 'MEDIUMINT' + (this._unsigned ? ' UNSIGNED' : '')
      case 'integer':
        return 'INTEGER' + (this._unsigned ? ' UNSIGNED' : '')
      case 'bigint':
        return 'BIGINT' + (this._unsigned ? ' UNSIGNED' : '')
      case 'decimal':
        return 'DECIMAL(' + (this.options.precision ? (this.options.precision + ',' + this.options.scale) : '') + ')'
      case 'float':
        return 'FLOAT'
      case 'double':
        return 'DOUBLE'
      case 'char':
        return 'CHAR(' + this._length + ')'
      case 'varchar':
        return 'VARCHAR(' + this._length + ')'
      case 'enum':
        return 'ENUM(\'' + this.options.values.join('\',\'') + '\')'
      case 'datetime':
        return 'DATETIME'
      case 'text':
        return 'TEXT'
      case 'json':
        return 'JSON'
      case 'custom':
        return this.options.definition
      default:
        throw new Error('getSqlType: Unknown Field Type `' + this.type + '`')
    }
  }

  getSqlValue (data) {
    switch (this.type) {
      case 'uuid':
      case 'char':
      case 'varchar':
      case 'enum':
      case 'bigint':
      case 'integer':
      case 'decimal':
      case 'float':
      case 'double':
      case 'text':
      case 'tinyint':
        return data
      case 'datetime':
        return moment(data).utc().format('YYYY-MM-DD HH:mm:ss')
      case 'json':
        return JSON.stringify(data)
      default:
        throw new Error('getSqlValue: Unknown Field Type `' + this.type + '`')
    }
  }
}

module.exports = Field
