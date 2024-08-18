const ValidatorObject = requireServer('ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONString('name', false)
  post.JSONString('id', false)

  const patch = new ValidatorObject({context: context, type: 'object'})
  patch.JSONString('request_number', true)
  patch.JSONString('id', true)
  patch.JSONString('area_id', true)
  patch.JSONString('name', true)

  return {
    post: post,
    patch: patch
  }
}
