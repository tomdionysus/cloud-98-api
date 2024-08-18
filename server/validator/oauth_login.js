const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})

  post.JSONString('provider', false)
  post.JSONString('client_id', true)
  post.JSONString('credential', false)

  return {
    post: post,
  }
}
