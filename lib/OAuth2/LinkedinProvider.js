const OAuth2 = require('../OAuth2')
const OAuth2Provider = require('./OAuth2Provider')

const querystring = require('querystring')

class LinkedinProvider extends OAuth2Provider {
	constructor(engine, options) {
		options = options || {}
		super(engine,options)

		this.urlGetCode = options.urlGetCode || 'https://www.linkedin.com/oauth/v2/authorization'
		this.urlGetAccessToken = options.urlGetAccessToken || 'https://www.linkedin.com/oauth/v2/accessToken'
		this.urlGetUserContext = options.urlGetUserContext || 'https://api.linkedin.com/v1/people/~:(email-address)?format=json'
		this.scope = 'r_emailaddress'
		this.name = 'linkedin'
	}

	getAccessTokenOptions(context) {
		return {
			method: 'POST',
			url: this.urlGetAccessToken+'?',      
			headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
			body: querystring.stringify(context),
		}
	}

	getOutputData(original) {
		return {
			name: original.emailAddress,
			email: original.emailAddress,
			providerUserId: original.emailAddress,
		}
	}
}

OAuth2.register('linkedin',LinkedinProvider)
module.exports = LinkedinProvider