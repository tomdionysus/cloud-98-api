class KVStore {
  set (key, data, expires, callback) { throw new Error('Not Implemented') }
  get (key, callback) { throw new Error('Not Implemented') }
  del (key, callback) { throw new Error('Not Implemented') }
  incr (key, amount, cb) { throw new Error('Not Implemented') }
  decr (key, amount, cb) { throw new Error('Not Implemented') }
}

module.exports = KVStore
