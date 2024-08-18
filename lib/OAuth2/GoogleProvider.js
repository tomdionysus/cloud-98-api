const OAuth2 = require('../OAuth2')
const OAuth2Provider = require('./OAuth2Provider')

class GoogleProvider extends OAuth2Provider {
	constructor(engine, options) {
		options = options || {}
		super(engine,options)

		this.urlGetCode = options.urlGetCode || 'https://accounts.google.com/o/oauth2/v2/auth'
		this.urlGetAccessToken = options.urlGetAccessToken || 'https://www.googleapis.com/oauth2/v4/token'
		this.urlGetUserContext = options.urlGetUserContext || 'https://www.googleapis.com/oauth2/v1/userinfo'
		this.scope = 'openid email'
		this.name = 'google'
	}
}

OAuth2.register('google',GoogleProvider)
module.exports = GoogleProvider