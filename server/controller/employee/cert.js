const async = require('async')
const _ = require('underscore')

module.exports = {
  // GET /v1/employee/cert
  // Return current user payroll information

  post (req, res, next) {
    const errs = this.validator.validate(req.body, 'cert.post')
    if (errs.length > 0) { return this.status422End(res, errs) }

    var id = this.mysql.bigid(), certType, reference

    this.mysql.asyncTransaction([
      (tr,cb) => {
        this.mysql.query('SELECT COUNT(*) AS c FROM `cert` WHERE `user_id`=? AND `cert_type_id`=?' , [ req.session.user.id, req.body.cert_type_id ], (err, results) => {
          if(err) return cb(err)
          if(results[0].c!=0) return cb({code:'CERT_ALREADY_EXISTS',message:'A certification of this type already exists. Please remove or update the existing certification', ref:'cert_type_id'})
          cb()
        })
      },
      (tr,cb) => {
        this.mysql.query('SELECT * FROM `cert_type` WHERE `id`=?' , [ req.body.cert_type_id ], (err, results) => {
          if(err) return cb(err)
          if(results.length===0) return cb({code:'NOT_FOUND', message: 'The cert_type was not found'})
          certType = results[0]
          cb()
        })
      },
      (tr,cb) => {
        var info = this.verifier.get(certType.verifier).info()
        reference = req.body.verifier_params[info.reference]
        this.mysql.query('INSERT INTO `cert` (id, user_id, cert_type_id, reference, status) VALUES(?,?,?,?,"pending")' , [ id, req.session.user.id, req.body.cert_type_id, reference ], cb)
      },
      (tr,cb) => {
        // Async Verify
        setTimeout(()=>{
          this.verifier.verify(certType.verifier, req.session.user.id, id, req.body.verifier_params, (err, data) => {
            if(err) return this.logger.error("Verifier Error", err)
            this.logger.debug("Verifier Returned ", JSON.stringify(data))
            this.systemEvent(tr, req.session.user.id, null, 'cert.verification', { cert: { id, cert_type_id: req.body.cert_type_id, reference }, verifier: data })
          })
        }, 1000)
        cb()
      },
      // System Log
      (tr, cb) => {
        this.systemEvent(tr, req.session.user.id, null, 'cert.created', { cert: { id, user_id: req.session.user.id, cert_type_id: req.body.cert_type_id, reference } }, cb)
      }
    ], (err, data) =>{

      if (err) {
        switch (err.code) {
          case 'NOT_FOUND':
            return this.status404End(res, [err])
          case 'CERT_ALREADY_EXISTS':
            return this.status409End(res, [err])
          default:
            return this.status500End(res)
        }
      }

      req.body.status = 'pending'

      res.status(200)
      res.primaryEntity = 'cert'
      res.json = {
        code: 'OK',
        cert: this.presenter.presentArray([req.body], 'cert')
      }
      next()
    })
  }
}
