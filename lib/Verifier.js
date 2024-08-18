const _ = require('underscore')
const path = require('path')

const fs = require('fs')
const async = require('async')
const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

class Verifier {
  constructor ({logger, verifiersDir, mysql}) {
    this.logger = new ScopedLogger('Verifier', logger || new Logger())
    this.verifiersDir = verifiersDir || path.join(__dirname, '../server/verifiers')
    this.mysql = mysql
    this.types = {}
  }

  list(prefix = '') {
    var out = []
    var root = this.get(prefix) || this.types
    this._list(root,out)
    return out
  }

  _list(root, out) {
    for(var i in root) {
      if(root[i].info) {
        this._list(root[i],out)
      } else {
        out.push(root[i].info())
      }
    } 
  }

  get (typePath) {
    const type = typePath.split('.')
    let cur = this.types
    while (cur !== undefined && type.length > 0) { cur = cur[type.shift()] }
    return cur
  }

  verify(typePath, userId, certId, data, callback = ()=>{}) {
    var verifier = this.get(typePath)
    if(!verifier) {
      this.logger.error("verify: Cannot find verifier", typePath)
      return callback({code:'VERIFIER_NOT_FOUND', ref: typePath})
    }

    var output, legalName

    async.series([
      // Get Legal Name
      (cb) => {
        this.mysql.query("SELECT `legal_name` FROM `user` WHERE `id`=?", [userId], (err, data) => {
          if(err) return cb(err)
          if(data.length===0) return cb({code: 'USER_NOT_FOUND'})
          legalName = data[0].legal_name
          cb()
        })
      },
      (cb) => {     
        verifier.verify(userId, certId, legalName, data, (err, data)=> {
          if(err) {
            this.logger.error("verify: verifier error", typePath, err)
            return callback({code:'VERIFIER_ERROR', ref: typePath, certId: certId})
          }
          this.mysql.query('UPDATE `cert` SET `status`=?,`valid_from_utc`=?,`valid_to_utc`=?,`notes`=?,`legal_name`=?,`reference`=?,`verified_utc`=NOW() WHERE `id`=? AND `user_id`=?', [ data.status, data.valid_from_utc, data.valid_to_utc, data.notes, legalName, data.reference, certId, userId ], (err) => {
            if(err) return cb(err)
            output = data
            cb(null, data)
          })
        })
      }
    ], (err) => {
      if(err) return callback(err)
      callback(null, output)
    })
  }

  load () {
    this._load(this.verifiersDir, this.types)
  }

  _load (filePath, root, dispPath) {
    const files = fs.readdirSync(filePath)
    for (const i in files) {
      const file = files[i]
      const fullPath = path.join(filePath, file)
      const stats = fs.statSync(fullPath)
      const basename = path.basename(file, '.js')
      if (stats.isDirectory()) {
        root[basename] = {}
        this._load(fullPath, root[basename], (dispPath ? dispPath+'.' : '')+basename)
      } else {
        this.logger.debug('Loading Verifier `%s`', (dispPath ? dispPath+'.' : '')+basename)
        var klass = require(fullPath)
        root[basename] = new klass({logger: this.logger, mysql: this.mysql})
      }
    }
  }
}

module.exports = Verifier
