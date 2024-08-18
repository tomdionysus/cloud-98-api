module.exports = {
  get: function (req, res, next) {
    if (!req.session) { return this.status403End(res) }

    res.json = {
      user: {
        id: req.session.user.id,
        name: req.session.user.first_name,
        first_name: req.session.user.first_name,
        last_name: req.session.user.last_name,
        email: req.session.user.email,
        image_id: req.session.user.image_id,
        account_id: req.session.user.account_id
      },
      session: { id: req.session.id },
      organisation: req.session.organisation,
      organisations: req.session.organisations,
      account: req.session.account,
      scopes: {
        user_id: req.session.user ? req.session.user.id : null,
        organisation_id: req.session.organisation ? req.session.organisation.id : null
      }
    }
    next()
  },

  post: function (req, res, next) {
    if (req.body.email) req.body.email = req.body.email.toString().trim()
    const errs = this.validator.validate(req.body, 'session.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    this.login.checkLogin(req.body.email, req.body.password, (err, ok, session) => {
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
  },

  patch: function (req, res, next) {
    const errs = this.validator.validate(req.body, 'session.patch')

    if (!req.session) { return this.status403End(res) }
    if (errs.length > 0) { return this.status422End(res, errs) }

    const sessionId = req.session.id

    this.session.load(sessionId, (err, id, data) => {
      if (err) { return next(err) }

      // Session exists?
      if (!data) { return this.status401End(res) }

      // Org Exists?
      var newOrganisation = data.organisations.filter((org) => org.id === req.body.organisation_id)[0]
      if (!newOrganisation) { return this.status404(res, [{code: 'ORGANISATION_NOT_FOUND', message: 'The specified organisation was not found', ref: 'organisation_id'}]) }

      const sessionData = {
        created_at: req.session.created_at,
        user: req.session.user,
        organisations: req.session.organisations,
        account: req.session.account,
        organisation: newOrganisation,
        refresh_token: req.session.refresh_token,
      }

      this.session.save(sessionId, sessionData, 86400, (err, sessionId) => {
        if (err) { return this.status500End(res, err) }

        req.session = sessionData
        res.json = {
          code: 'OK',
          user: { id: req.session.user.id, name: req.session.user.name, email: req.session.user.email, image_id: req.session.user.image_id, account_id: req.session.account_id },
          session: { id: sessionId, refresh_token: req.session.refresh_token },
          organisation: newOrganisation,
          organisations: req.session.organisations,
          account: req.session.account, 
        }
        next()
      })
    })
  },

  delete: function (req, res, next) {
    if (!req.session) { return this.status403End(res) }

    this.session.delete(req.session.id, (err) => {
      if (err) { return next(err) }

      res.json = { code: 'OK', message: 'Session logged out', ref: req.session.id }
      next()
    })
  }
}
