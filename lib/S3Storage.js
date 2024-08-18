const path = require('path')
const stream = require('stream')
const AWS = require('@aws-sdk/client-s3')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

class S3Storage {
  constructor (options) {
    options = options || {}
    this.logger = new ScopedLogger('S3Storage', options.logger || new Logger())
    this.bucket = options.bucket
    this.region = options.region
    this.pathPrefix = options.pathPrefix || ''
    this.client = options.client || new AWS.S3({ region: this.region })
  }

  save (key, fileData, callback) {
    const prefixKey = path.join(this.pathPrefix, key)
    this.logger.debug('Saving Key `%s`', prefixKey)
    const params = { Bucket: this.bucket, Key: prefixKey, Body: fileData }
    this.client.putObject(params, (err) => {
      if (err) { this.logger.error('Error setting key `%s`', prefixKey, err); callback(err); return }
      callback(null)
    })
  }

  // S3 Only
  saveWithMimeACL (key, fileData, mime, acl, callback) {
    const prefixKey = path.join(this.pathPrefix, key)
    this.logger.debug('Saving Key `%s` (MIME: %s ACL)', prefixKey, mime)
    const params = {
      Bucket: this.bucket,
      Key: prefixKey,
      Body: fileData,
      ContentType: mime,
      ACL: acl
    }
    this.client.putObject(params, (err) => {
      if (err) { this.logger.error('Error setting key `%s`', prefixKey, err); callback(err); return }
      callback(null)
    })
  }

  load (key, callback) {
    const prefixKey = path.join(this.pathPrefix, key)
    this.logger.debug('Loading Key `%s`', prefixKey)
    const params = { Bucket: this.bucket, Key: prefixKey }
    this.client.getObject(params, (err, data) => {
      if (err) {
        this.logger.error('Error getting key `%s`', prefixKey, err)
        callback(err)
        return
      }
      callback(null, data)
    })
  }

  exists (key, callback) {
    const prefixKey = path.join(this.pathPrefix, key)
    this.logger.debug('Checking Key `%s`', prefixKey)
    const params = { Bucket: this.bucket, Key: prefixKey }
    this.client.headObject(params, (err) => {
      if (err) {
        if (err.toString().indexOf('NotFound') === 0) { callback(null, false); return }
        this.logger.error('Error checking key `%s`', prefixKey, err)
        callback(err)
        return
      }
      callback(null, true)
    })
  }

  getUploadStream (key, mime, acl, callback) {
    const pass = new stream.PassThrough()
    const prefixKey = path.join(this.pathPrefix, key)
    this.logger.debug('Uploading to Key `%s`', prefixKey)
    const params = {
      Bucket: this.bucket,
      Key: prefixKey,
      Body: pass,
      ContentType: mime,
      ACL: acl
    }
    const managedUpload = this.client.upload(params, (err) => {
      if (err) { this.logger.error('Upload stream failed for key `%s`: %s', prefixKey, err.message); if (callback) { callback(err); return } }
      this.logger.debug('Upload Complete for Key `%s`', prefixKey)
      if (callback) callback(null)
    })
    managedUpload.on('error', () => {
      pass.end()
    })
    managedUpload.on('httpUploadProgress', (progress) => {
      this.logger.debug('Upload Stream Progress `%s` %s', prefixKey, progress)
    })
    pass.on('error', (err) => {
      this.logger.error('Input Stream Error while streaming to key `%s`', prefixKey, err)
      managedUpload.abort()
      if (callback) callback(err)
    })
    return pass
  }

  getDownloadStream (key) {
    const prefixKey = path.join(this.pathPrefix, key)
    this.logger.debug('Downloading from Streaming Key `%s`', prefixKey)
    const params = { Bucket: this.bucket, Key: prefixKey }
    const pass = this.client.getObject(params).createReadStream()
    if (!pass) { this.logger.error('Download stream failed for key `%s`', prefixKey); return null }
    return pass
  }

  delete (key, callback) {
    const prefixKey = path.join(this.pathPrefix, key)
    this.logger.debug('Deleting Key `%s`', prefixKey)
    const params = { Bucket: this.bucket, Key: prefixKey }
    this.client.deleteObject(params, (err) => {
      if (err) {
        this.logger.error('Error deleting key `%s`', prefixKey, err)
        callback(err)
        return
      }
      callback(null, true)
    })
  }
}

module.exports = S3Storage
