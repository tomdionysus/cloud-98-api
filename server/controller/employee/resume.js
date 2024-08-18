const async = require('async')
const _ = require('underscore')
const { Readable } = require('stream')
const mime = require('node-mime-types')

module.exports = {

  get (req, res, next) {
    var resumeId = req.params.id || req.session.user.id

    this.s3storage.load('resume/'+resumeId, (err, data)=>{
      if(err) {
        switch(err.code) {
          case 'NoSuchKey':
            return this.status404End(res, [ {code: 'RESUME_NOT_FOUND', description:'No resume found', ref:'{id}'} ])

          default:
            return this.status422End(res, [ {code: 'FILE_DOWNLOAD_FAILED', description:'The file download failed'} ])
        }
      }
      res.status(200)
      res.set('content-type', data.ContentType)
      res.set('content-length', data.ContentLength)
      var ext = mime.getExtension(data.ContentType)
      if(ext.length>0) ext = ext[0]
      res.set('content-disposition', 'attachment; filename="Resume-'+resumeId+ext+'";')

      Readable.from(data.Body).pipe(res)
    })
  },

  post (req, res, next) {
    if(!req.body.file || !req.body.file.stream) return this.status422End(res, [ {code: 'NO_FILE', description:'No file has been uploaded', ref:'file'} ] )

    this.mysql.query('UPDATE `user` SET `has_resume` = "Y" WHERE `id`= ?', [ req.session.user.id ], (err) => {
      if(err) return this.status500End(res)

      var stream = this.s3storage.getUploadStream('resume/'+req.session.user.id, req.body.file.mimetype, null, (err)=>{
        if(err) return this.status422End(res, [ {code: 'FILE_UPLOAD_FAILED', description:'The file upload failed', ref:'file'} ])

        res.status(200)
        res.primaryEntity = 'resume'
        res.json = {
          resume: {
            id: req.session.user.id,
            type: req.body.file.mimetype,
          }
        }
        next()
      })

      req.body.file.stream.pipe(stream)
    })
  },

  delete (req, res, next) {
    this.mysql.asyncTransaction([
      (tr, cb) => tr.query('UPDATE `user` SET `has_resume` = "N" WHERE `id`= ?', [ req.session.user.id ], cb),
      (tr, cb) => {
        this.s3storage.delete('resume/'+req.session.user.id, (err) =>{
          if(err && err.code!=='NoSuchKey') return cb({code: 'FILE_DELETE_FAILED', description:'The file delete failed' })
          cb()
        })
      } 
    ], (err) => {
      if(err) return this.status422End(res, [ err ])

      res.status(200)
      res.primaryEntity = 'resume'
      res.json = {
        code: 'OK',
        resume: { id: req.session.user.id }
      }
      next()
    })
  }
}