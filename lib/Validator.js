const _ = require('underscore')
const path = require('path')

const fs = require('fs')
const Logger = require('./Logger')
const ValidatorObject = require('./ValidatorObject')
const ScopedLogger = require('./ScopedLogger')

class Validator {
  constructor ({logger, validatorsPath, mysql} = {}) {
    this.logger = new ScopedLogger('Validator', logger || new Logger())
    this.path = validatorsPath || path.join(__dirname, '../server/validator')
    this.mysql = mysql
    
    this.types = {}
  }

  load () {
    this._load(this.path, this.types)
  }

  validate (data, typePath) {
    const type = typePath.split('.')
    let cur = this.types
    while (cur !== undefined && type.length > 0) {
      cur = cur[type.shift()]
    }
    if (!cur) throw new Error('The ValidatorObject ' + typePath + ' is not registered')
    return cur.validate(data, '')
  }

  getFields (typePath) {
    const type = typePath.split('.')
    let cur = this.types
    while (cur !== undefined && type.length > 0) {
      cur = cur[type.shift()]
    }
    if (!cur) { throw new Error('The ValidatorObject ' + typePath + ' is not registered') }
    return cur.fields
  }

  getFieldsArray (typePath) {
    return _.keys(this.getFields(typePath))
  }

  _load (filePath, root) {
    const files = fs.readdirSync(filePath)
    for (const i in files) {
      const file = files[i]
      const fullPath = path.join(filePath, file)
      const basename = path.basename(file, '.js')
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        root[basename] = {}
        this._load(fullPath, root[basename])
      } else {
        this.logger.debug('Loading Validator `%s`', basename)
        root[basename] = require(fullPath)(this)
      }
    }
  }

  openAPIComponents () {
    const out = {
      uuid: { type: 'string', pattern: '/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/' },
      bigint: { type: 'integer', format: 'int64' }
    }
    for (const i in this.types) {
      const t = this.types[i].post
      if (t && t.openAPIComponent) out[i] = t.openAPIComponent()
    }
    return out
  }
}

module.exports = Validator
