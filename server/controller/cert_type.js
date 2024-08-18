const async = require('async')
const path = require('path')
const fs = require('fs')

// /v1/cert_type/{cert_type_id}/verifier_info

module.exports = {
  get: function (req, res, next) {
    this.mysql.query('SELECT `verifier` FROM `cert_type` WHERE `id`=?', [ req.params.cert_type_id ], (err, data) => {
      if(err) return this.status500End(res)
      if(data.length===0) return this.status403End(res)

      var verifierName = data[0].verifier || ''

      var verifier = this.verifier.get(verifierName)
      if(!verifier) {
        this.logger.error("Verifier "+verifierName+" Not Registered (cert_type = "+req.params.cert_type_id+")")
        return this.status500End(res)
      }

      res.status(200)
      res.json = { 
        code: 'OK',
        verifier: verifier.info(),
      }
      next()
    })
  }
}
