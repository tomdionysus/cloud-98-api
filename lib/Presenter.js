const path = require('path')
const fs = require('fs')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')
const PresenterObject = require('./PresenterObject')

class Presenter {
  constructor (options = {}) {
    this.logger = new ScopedLogger('Presenter', options.logger || new Logger())
    this.options = options
    this.path = options.path || path.join(__dirname, '../server/presenter')
    this.types = {}
  }

  load () {
    this._load(this.path, this.types)
  }

  get (typePath) {
    const type = typePath.split('.')
    let cur = this.types
    while (cur && type.length > 0) {
      cur = cur[type.shift()]
    }
    return cur
  }

  present (data, typePath) {
    const pres = this.get(typePath)
    if (!pres) return data

    return pres.present(data)
  }

  presentArray (data, typePath) {
    const pres = this.get(typePath)
    if (!pres) return data

    const out = []
    for (const i in data) {
      out.push(pres.present(data[i]))
    }
    return out
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
        continue
      }
      if (basename + '.js' !== file) continue
      this.logger.debug('Loading Presenter `%s`', basename)
      root[basename] = require(fullPath)(PresenterObject)
    }
  }
}

module.exports = Presenter
