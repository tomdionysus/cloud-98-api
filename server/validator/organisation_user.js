const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})

  post.JSONStringBigInt('id', false)
  post.JSONStringBigInt('user_id', false)
  post.JSONStringBigInt('organisation_id', false)
  post.JSONString('roles', true)

  const patch = new ValidatorObject({context: context, type: 'object'})
  patch.JSONString('roles', false)

  return {
    post: post,
    patch: patch,
  }
}
