const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const file = new ValidatorObject({context: context, type: 'object'})
  file.JSONString('filename', true, { minLength: 3, maxLength: 128 })
  file.JSONString('encoding', true, { minLength: 3, maxLength: 128 })
  file.JSONString('mimetype', true, { minLength: 3, maxLength: 128 })
  file.JSONVariant('stream', true)
  file.JSONInteger('length', true)

  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONObject('file', true, file)

  return {
    post: post
  }
}
