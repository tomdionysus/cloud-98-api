const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})

  post.JSONStringBigInt('id', false)
  post.JSONString('name', false, { maxLength: 1024 })
  post.JSONString('cidr', false, { maxLength: 18 })
  post.JSONStringBigInt('vpc_id', false)
  
  const patch = new ValidatorObject({context: context, type: 'object'})
  patch.JSONString('name', false, { maxLength: 1024 })

  return {
    post: post,
    patch: patch,
  }
}
