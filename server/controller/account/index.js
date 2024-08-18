module.exports = {
  get (req, res, next) {
    this.mysql.asyncTransaction([
      (t, cb) => { t.query('SELECT `account`.* FROM `account` WHERE `id` = ?', [ req.session.organisation.account_id ], cb) },
    ], (err, results) => {
      if (err) return this.status500End(res)

      res.status(200)
      res.json = { code: 'OK', account: this.presenter.presentArray(results[0][0], 'account') }
      next()
    })
  },

  patch (req, res, next) {
    const errs = this.validator.validate(req.body, 'account.patch')
    if (errs.length > 0) { return this.status422End(res, errs) }

    const data = this.schema.get('account').getUpdateData(req.body)
    var account

    data.values.push(req.session.organisation.account_id)

    this.mysql.asyncTransaction([
      (t, cb) => { 
        if(data.assigns.length===0) { return cb() }
        t.query('UPDATE `account` SET '+data.assigns.join(', ')+' WHERE `id`=?', data.values, cb)
      },
      (t, cb) => { 
        t.query('SELECT `account`.* FROM `account` WHERE `id` = ?', [ req.session.organisation.account_id ], (err, data) => {
          if(err) { return cb(err) }
          account = data[0]
          cb()
        }) 
      },
      // Create Stripe Customer if non existent
      (t, cb) => {
        if(account.stripe_customer_id) { 
          this.stripe.updateCustomer(account.stripe_customer_id, req.session.organisation.account_id, req.session.organisation.name, req.session.organisation.invoicing_email, req.body.phone_number, {
            line1: account.address1,
            line2: account.address2,
            city: account.city,
            state: account.state,
            country: 'NZ',
            postal_code: account.postal_code,
          }, cb)
        } else {
          this.stripe.createCustomer(req.session.organisation.account_id, req.session.organisation.name, req.session.organisation.invoicing_email, req.body.phone_number, {
            line1: account.address1,
            line2: account.address2,
            city: account.city,
            state: account.state,
            country: 'NZ',
            postal_code: account.postal_code,
          }, (err, data) => {
            if(err) { return cb(err) }
            t.query('UPDATE `account` SET stripe_customer_id = ? WHERE `id`=?', [ data.id, req.session.organisation.account_id ], cb)
          })
        }
      }
    ], (err, results) => {
      if (err) { return this.status500End(res) }

      res.status(200)
      res.json = { code: 'OK', account: this.presenter.presentArray([account], 'account') }
      next()
    })
  }
}
