const async = require('async')
const uuidv4 = require('uuid/v4')

module.exports = {
	get: function(req, res, next) {
		if(!req.query.state || !req.query.code) {
			this.statusEnd(res, 404)
			return
		}

		var state, userContext, sessiondata, userSocialCount

		async.series([
			(cb) => { 
				this.oauth2.getAccessToken(req.query.state, req.query.code, (err, data) => { 
					if(err) { return cb(err) }
					if(data == null) { return this.status401End(res, 'NOT_AUTHORIZED') }
					state = data
					cb()
				})
			},
			(cb) => { 
				this.oauth2.getUserContext(state, (err, context) => {
					if(err) { return cb(err) }
					userContext = context
					cb()
				}) 
			},
			(cb) => { 
				this.login.bypassLogin(userContext.email, (err, ok, context) => {
					if(err) { return cb(err) }

					if(!context || !context.user) {
						return this.statusEnd(res, 404, 'NO_ACCOUNT', 'No StaffLtd Account found', { email: userContext.email })
					}

					if(context.user.email_confirmed!='Y') {
						return this.status401End(res, 'CONFIRM_ACCOUNT_EMAIL')
					}

					sessiondata = {
						created_at: new Date(),
						user: context.user,
						organisation: context.organisation,
						organisations: context.organisations,
						account: context.account,
					}

					cb()
				})
			},
			(cb) => {
				// user_social records exist?
				this.mysql.query('SELECT COUNT(*) AS c FROM user_social WHERE user_id = ? AND provider = ?', [ sessiondata.user.id, state.provider ], (err, result) => {
					if(err) { return cb(err) }
					userSocialCount = result[0].c
					cb(null)
				}) 
			},
			(cb) => {
				// Insert or update user_social
				if(userSocialCount==0) { 
					this.mysql.query('INSERT INTO user_social (id, user_id, provider, provider_user_id, access_token, access_token_expiry) VALUES (?,?,?,?,?,?)', [ uuidv4(), sessiondata.user.id, state.provider, userContext.providerUserId, state.accessToken, state.expiresIn ], cb)
				} else {
					this.mysql.query('UPDATE user_social SET access_token = ?, access_token_expiry = ? WHERE user_id = ? AND provider = ?', [ state.accessToken, state.expiresIn, sessiondata.user.id, state.provider ], cb)
				}
			},
			(cb) => { 
				this.session.create(sessiondata, 86400, (err, sessionId) => {
					if(err) { return cb(err) }
					sessiondata.id = sessionId
					cb()
				})
			},
		], (err) => {
			if (err) { this.statusEnd(res, 500); return }

			res.status(200).json = { code: 'OK', session: sessiondata, state: state.state }
				
			next()
		})
	}
}