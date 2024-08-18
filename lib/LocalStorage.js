const path = require('path')
const fs = require('fs')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

class LocalStorage {
  constructor (options) {
    options = options || {}
    this.options = options
    this.logger = new ScopedLogger('LocalStorage', options.logger || new Logger())
    this.path = options.path || path.join(__dirname, '../upload')
    this.fs = options.fs || fs
  }

  save (fileId, fileData, callback) {
    const fileName = path.join(this.path, fileId)
    this.logger.info('Saving File %s', fileName)
    this.fs.writeFile(fileName, fileData, (err) => {
      if (err) { this.logger.error('Error saving file %s', fileName, err) }
      callback(err)
    })
  }

  load (fileId, callback) {
    const fileName = path.join(this.path, fileId)
    this.logger.info('Loading File %s', fileName)
    this.fs.readFile(fileName, (err, data) => {
      if (err) { this.logger.error('Error loading file %s', fileName, err); callback(err); return }
      callback(null, data)
    })
  }

  exists (fileId, callback) {
    const fileName = path.join(this.path, fileId)
    this.fs.access(fileName, this.fs.constants.F_OK, (err) => {
      if (err) {
        if (err.code === 'ENOENT') { callback(null, false); return }
        this.logger.error('Error checking file exists ' + fileName + ': ', err)
        callback(err)
        return
      }
      callback(err, true)
    })
  }

  getUploadStream (fileId, mime, acl, callback) {
    const fileName = path.join(this.path, fileId)
    this.logger.info('Upload Streaming File %s', fileName)
    const stream = this.fs.createWriteStream(fileName)
    if (!stream) {
      this.logger.error('Error creating write file stream %s', fileName)
      callback({ message: 'Error creating write file stream', filename: fileName })
      return
    }
    callback(null, stream)
  }

  getDownloadStream (fileId, callback) {
    const fileName = path.join(this.path, fileId)
    this.logger.info('Download Streaming File %s', fileName)
    const stream = this.fs.createReadStream(fileName)
    if (!stream) {
      this.logger.error('Error creating read file stream %s', fileName)
      callback({ message: 'Error creating read file stream', filename: fileName })
      return
    }
    callback(null, stream)
  }

  delete (fileId, callback) {
    const fileName = path.join(this.path, fileId)
    this.logger.info('Deleting File %s', fileName)
    this.fs.unlink(fileName, (err) => {
      if (err) { this.logger.error('Error deleting file %s', fileName, err) }
      callback(err)
    })
  }
}

module.exports = LocalStorage
