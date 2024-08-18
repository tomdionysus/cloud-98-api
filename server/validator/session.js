const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONEmail('email', false)
  post.JSONString('password', false, { minLength: 8, maxLength: 128 })

  const patch = new ValidatorObject({context: context, type: 'object'})
  patch.JSONStringBigInt('organisation_id', true)

  const refresh = new ValidatorObject({context: context, type: 'object'})
  refresh.JSONString('refresh_token', false, { minLength: 128, maxLength: 128 })

  return {
    post: post,
    patch: patch,
    refresh: refresh,
  }
}
