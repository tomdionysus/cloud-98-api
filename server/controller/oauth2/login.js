const async = require('async')
const uuidv4 = require('uuid/v4')

const {OAuth2Client} = require('google-auth-library')
const client = new OAuth2Client(process.env.OAUTH2_GOOGLE_CLIENT_ID);

// POST /v1/oauth/login

module.exports = {
	post: function(req, res, next) {
	    // Essential Validation
	    const errs = this.validator.validate(req.body, 'oauth_login.post')
	    if(req.body.provider!=='google') errs.push({code:'PROVIDER_NOT_RECOGNISED',message:'The provider was not recognised', ref: 'provider'})
	    if (errs.length > 0) { return this.status422End(res, errs) }

	    client.verifyIdToken({
			idToken: req.body.credential,
			audience: process.env.OAUTH2_GOOGLE_CLIENT_ID
		}, (err, ticket) => {
			if(err) return this.status403End(res)
			const payload = ticket.getPayload()
			if(!payload.email_verified) return this.status403End(res)
	
			this.login.bypassLogin(payload.email, (err, ok, session) => {
		      if (!ok) { return this.status401End(res) }

		      const sessionData = {
		        created_at: new Date(),
		        user: session.user,
		        organisation: session.organisation,
		        organisations: session.organisations,
		        account: session.account,
		        scopes: {
		          user_id: session.user ? session.user.id : null,
		          organisation_id: session.organisation ? session.organisation.id : null
		        }
		      }

		      this.session.create(sessionData, 86400, (err, session_id) => {
		        if (err) { return this.statusEnd(res, 500) }

		        req.session = sessionData
		        res.json = {
		          user: { id: session.user.id, name: session.user.first_name, first_name: session.user.first_name, last_name: session.user.last_name, email: session.user.email, image_id: session.user.image_id, account_id: session.user.account_id },
		          session: { id: session_id, refresh_token: session.user.refresh_token },
		          organisation: session.organisation,
		          organisations: session.organisations
		        }
		        next()
		      })
		    })
		})
	}
}