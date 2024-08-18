const ValidatorObject = requireServer('ValidatorObject')

module.exports = function (context) {
  const file = new ValidatorObject({context: context, type: 'object'})
  file.JSONString('filename', true)
  file.JSONString('encoding', true)
  file.JSONString('mimetype', true)
  file.JSONVariant('stream', true)
  file.JSONInteger('length', true)

  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONObject('file', true, file)

  return {
    post: post
  }
}
