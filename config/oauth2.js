module.exports = {
	google: {
		clientId: process.env.OAUTH2_GOOGLE_CLIENT_ID,
		clientSecret: process.env.OAUTH2_GOOGLE_CLIENT_SECRET,
		callbackUrl: process.env.OAUTH2_CALLBACK_URL,
	},
	facebook: {
		clientId: process.env.OAUTH2_FACEBOOK_CLIENT_ID,
		clientSecret: process.env.OAUTH2_FACEBOOK_CLIENT_SECRET,
		callbackUrl: process.env.OAUTH2_CALLBACK_URL,
	},
	linkedin: {
		clientId: process.env.OAUTH2_LINKEDIN_CLIENT_ID,
		clientSecret: process.env.OAUTH2_LINKEDIN_CLIENT_SECRET,
		callbackUrl: process.env.OAUTH2_CALLBACK_URL,
	},
}