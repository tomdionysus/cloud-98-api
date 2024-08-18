const crypto = require('crypto')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

var globalProviders = {}

class OAuth2 {
	constructor(options) {
		options = options || {}
		this.logger = new ScopedLogger('OAuth2', options.logger || new Logger())
		this.kvstore = options.kvstore
		this.config = options.config || {}
		this.providers = {}
		for(var p in globalProviders) {
			this.providers[p] = new globalProviders[p](this, this.config[p])
		}

		if(!this.kvstore) { throw 'kvstore not specified' }
		if(this.providers.length==0) { this.logger.warn('No OAuth2 Providers Loaded') }
	}

	static register(provider, providerClass) {
		globalProviders[provider] = providerClass
	}

	getProvider(provider) {
		return this.providers[provider]
	}

	getRequestURL(state, callback) {
		var pinst = this.getProvider(state.provider)
		if(!pinst) { 
			this.logger.warn('getRequestURL: Unknown Provider %s', state.provider)
			callback({ code:'UNKNOWN_PROVIDER', message:'Unknown Provider '+state.provider, ref: state.provider })
			return
		}
		pinst.getRequestURL(state, callback)
	}

	getAccessToken(stateId, requestToken, callback) {
		this.checkState(stateId, (err, state) => {
			if(err) { callback(err); return }
			if(!state) { callback(null,null); return }

			var pinst = this.getProvider(state.provider)
			if(!pinst) { 
				this.logger.warn('getAccessToken: Unknown Provider %s', state.provider)
				callback({ code:'UNKNOWN_PROVIDER', message:'Unknown Provider '+state.provider, ref: state.provider })
				return
			}
			pinst.getAccessToken(requestToken, state, callback)
		})
	}

	getUserContext(state, callback) {
		var pinst = this.getProvider(state.provider)
		if(!pinst) { 
			this.logger.warn('getUserContext: Unknown Provider %s', state.provider)
			callback({ code:'UNKNOWN_PROVIDER', message:'Unknown Provider '+state.provider, ref: state.provider })
			return
		}
		pinst.getUserContext(state.accessToken, callback)
	}

	generateState(data, expires, callback) {
		var stateId = crypto.randomBytes(16).toString('hex')

		this.kvstore.set(stateId, JSON.stringify(data), expires, (err) => {
			if (err) {
				this.logger.error('Saving OAuth2 State %s error', stateId, err)
				callback(err)
				return
			}
			this.logger.debug('Saved OAuth2 State %s, expires in %d sec', stateId, expires)
			callback(null, stateId)
		})
	}

	checkState(stateId, callback) {
		this.kvstore.get(stateId, (err, data) => { 
			if (err) {
				this.logger.error('Getting OAuth2 State %s error', stateId, err)
				callback(err)
				return
			}
			if(data==null) { callback(null,null); return }
			try {
				data = JSON.parse(data)
			} catch(err) {
				callback(err)
			}
			callback(null, data)
		})
	}
}

module.exports = OAuth2