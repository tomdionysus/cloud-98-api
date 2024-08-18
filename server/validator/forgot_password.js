const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONEmail('email', false)

  return {
    post: post
  }
}
