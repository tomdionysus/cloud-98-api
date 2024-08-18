const Logger = require('../Logger')
const ScopedLogger = require('../ScopedLogger')

const querystring = require('querystring')
const request = require('request')

class OAuth2Provider {
	constructor(engine, options) {
		this.engine = engine

		options = options || {}
		this.options = options
		this.clientId = options.clientId
		this.clientSecret = options.clientSecret
		this.callbackUrl = options.callbackUrl
		this.logger = new ScopedLogger(this.constructor.name, options.logger || new Logger())
	}

	getRequestURL(state, callback) {
		this.engine.generateState(state, 900, (err,stateId) => {
			if(err) { callback(err); return }
			var context = {
				client_id: this.clientId,
				response_type: 'code',
				scope: this.scope,
				redirect_uri: this.callbackUrl,
				state: stateId,
			}
			callback(null, this.urlGetCode+'?'+querystring.stringify(context))
		})
	}

	getAccessToken(requestToken, ourState, callback) {
		var context = {
			client_id: this.clientId,
			client_secret: this.clientSecret,
			redirect_uri: this.callbackUrl,
			code: requestToken,
			grant_type: 'authorization_code',
		}

		request(this.getAccessTokenOptions(context), (err, response, body) => {
			if(err) {
				this.logger.error('getAccessToken call returned error',err)
				callback(err)
				return
			}
			try {
				body = JSON.parse(body)
			} catch(err) {
				this.logger.error('getAccessToken JSON decode failed',err)
				callback({code:'JSON_ERROR', msg:'Cannot decode JSON from OAuth Server', err: err})
				return
			}
			if(body.error) {
				callback(null,null)
				return
			}
			callback(null, {
				provider: this.name,
				accessToken: body.access_token,
				expiresIn: body.expires_in,
				scope: body.scope,
				requestToken: requestToken,
				state: ourState,
			})
		})
	}

	getAccessTokenOptions(context) {
		return {
			method: 'POST',
			url: this.urlGetAccessToken+'?'+querystring.stringify(context),   
			headers: { 'Accept': 'application/json' },
		}
	}

	getUserContext(accessToken, callback) {
		request(this.getUserContextOptions(accessToken), (err, response, body) => {
			if(err) { callback(err); return }
			if(response.status==404) { callback(null, null); return }
			var original
			this.logger.debug('<- Provider: ',body)
			try {
				original = JSON.parse(body)
			} catch(err) {
				this.logger.error('getUserContext JSON decode failed',err)
				callback({code:'JSON_ERROR', msg:'Cannot decode JSON from OAuth Server', err: err})
				return
			}
			callback(null, this.getOutputData(original))
		})
	}

	getUserContextOptions(accessToken) {
		return {
			url: this.urlGetUserContext,
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer '+accessToken,
			}
		}
	}

	getOutputData(original) {
		return {
			name: original.name,
			email: original.email,
			providerUserId: original.id,
		}
	}
}

module.exports = OAuth2Provider
