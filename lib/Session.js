const crypto = require('crypto')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

// Session wraps session management, using kvstore as a session store.
class Session {
  constructor (options) {
    options = options || {}
    this.logger = new ScopedLogger('Session', options.logger || new Logger())

    this.kvstore = options.kvstore

    if (!this.kvstore) { throw new Error('kvstore not set') }
  }

  // create creates a session with the specified session data and expiry.
  // - data = [Object]   --- An object containing the session data, must be JSON encodable
  // - expiry = [Integer]   --- The expiry from now, in seconds
  // - callback = function(sessionId, error)   --- Callback when done with sessionId
  create (data, expires, callback) {
    data.id = crypto.randomBytes(16).toString('hex')
    this.logger.debug('Creating Session %s, expires in %d sec', data.id, expires)
    this.save(data.id, data, expires, callback)
  }

  // load gets the session with the specified sessionId.
  // sessionId = [String]   --- The session identifier as a hex-encoded 128bit value
  // - callback = function(data, error)   --- Callback when done with session data or null if no session
  load (sessionId, callback) {
    if (!sessionId) throw new Error('Session: load - sessionId is not defined')

    this.kvstore.get(sessionId, (err, data) => {
      if (err) {
        this.logger.error('Loading Session %s Error', sessionId, err)
        callback(err)
        return
      }

      if (!data) {
        this.logger.debug('Session %s Not Found', sessionId)
        callback(null, sessionId, null)
        return
      }

      // Decode JSON
      try {
        data = JSON.parse(data)
      } catch (e) {
        this.logger.error('Loading Session %s - Corrupt Session Data, Bad JSON', sessionId)
        callback(null, sessionId, null)
        return
      }

      this.logger.debug('Loaded Session %s', sessionId)
      callback(null, sessionId, data)
    })
  }

  // save updates the session with the specified sessionId
  // - callback = function(error)   --- Callback when done with sessionId
  save (sessionId, data, expires, callback) {
    if (!sessionId) throw new Error('Session: save - sessionId is not defined')

    this.kvstore.set(sessionId, JSON.stringify(data), expires, (err) => {
      if (err) {
        this.logger.error('Saving Session %s error', sessionId, err)
        callback(err)
        return
      }
      this.logger.debug('Saved Session %s, expires in %d sec', sessionId, expires)
      callback(null, sessionId)
    })
  }

  // delete ends the session with the specified sessionId
  // - callback = function(error)   --- Callback when done with sessionId
  delete (sessionId, callback) {
    if (!sessionId) throw new Error('Session: delete - sessionId is not defined')

    this.kvstore.del(sessionId, (err) => {
      if (err) {
        this.logger.error('Deleting Session %s error', sessionId, err)
        callback(err)
        return
      }
      this.logger.debug('Deleted Session %s', sessionId)
      callback(null, sessionId)
    })
  }
}

module.exports = Session
