class ScopedKVStore {
  constructor (scope, kvstore) {
    this.scope = scope
    this.kvstore = kvstore
  }

  set (key, data, expires, callback) { this.kvstore.set(this.scope + key, data, expires, callback) }
  get (key, callback) { this.kvstore.get(this.scope + key, callback) }
  del (key, callback) { this.kvstore.del(this.scope + key, callback) }
  increment (key, amount, cb) { this.kvstore.increment(this.scope + key, amount, cb) }
  decrement (key, amount, cb) { this.kvstore.decrement(this.scope + key, amount, cb) }
}

module.exports = ScopedKVStore
