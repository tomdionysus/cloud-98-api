class PrefixKVStore {
  constructor (options = {}) {
    this.kvstore = options.kvstore
    this.prefix = options.prefix
  }

  set (key, data, expires, callback) { return this.KVStore.set(this.prefix+key,data, expires, callback) }
  get (key, callback)  { return this.KVStore.get(this.prefix+key, callback) }
  del (key, callback)  { return this.KVStore.del(this.prefix+key, callback) }
  incr (key, amount, cb)  { return this.KVStore.incr(this.prefix+key, amount, callback) }
  decr (key, amount, cb)  { return this.KVStore.decr(this.prefix+key, amount, callback) }

module.exports = PrefixKVStore
