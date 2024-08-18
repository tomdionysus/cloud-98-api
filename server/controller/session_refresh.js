module.exports = {
  post: function (req, res, next) {
    const errs = this.validator.validate(req.body, 'session.refresh')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.login.checkLoginRefreshToken(req.body.refresh_token, (err, ok, session) => {
      if (!ok) { return this.status401End(res) }
      if (session.user.email_confirmed != 'Y') { return this.status403End(res, [ {code: 'ACCOUNT_EMAIL_NOT_CONFIRMED', message:'Please confirm your email before authorising', ref:'email'} ]) }

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
        if (err) return this.status500End(res)

        req.session = sessionData
        res.json = {
          user: { id: session.user.id, name: session.user.first_name, first_name: session.user.first_name, last_name: session.user.last_name, email: session.user.email, image_id: session.user.image_id, account_id: session.user.account_id },
          session: { id: session_id, refresh_token: session.refresh_token },
          organisation: session.organisation,
          organisations: session.organisations
        }
        next()
      })
    })
  }
}
