const OAuth2 = require('../OAuth2')
const OAuth2Provider = require('./OAuth2Provider')

class FacebookProvider extends OAuth2Provider {
	constructor(engine, options) {
		options = options || {}
		super(engine,options)

		this.urlGetCode = options.urlGetCode || 'https://www.facebook.com/v3.1/dialog/oauth'
		this.urlGetAccessToken = options.urlGetAccessToken || 'https://graph.facebook.com/v3.1/oauth/access_token'
		this.urlGetUserContext = options.urlGetUserContext || 'https://graph.facebook.com/v3.1/me?fields=name,email'
		this.scope = 'email'
		this.name = 'facebook'
	}
}

OAuth2.register('facebook',FacebookProvider)
module.exports = FacebookProvider