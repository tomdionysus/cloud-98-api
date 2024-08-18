const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})

  post.JSONStringBigInt('id', false)
  post.JSONString('name', false)
  post.JSONString('description', false)
  post.JSONStringBigInt('image_id', true)

  post.JSONEnum('status', false, ['created','verified','hold'])
  post.JSONEnum('create_user', true, ['Y','N'])
  
  post.JSONString('address1', true)
  post.JSONString('address2', true)
  post.JSONString('city', true)
  post.JSONString('state', true)
  post.JSONString('postal_code', true)
  
  post.JSONString('phone_number', true)

  const patch = new ValidatorObject({context: context, type: 'object'})
  patch.JSONString('name', true)
  patch.JSONString('description', true)
  patch.JSONStringBigInt('image_id', true)
  patch.JSONEnum('status', true, ['created','verified','hold'])

  return {
    post: post,
    patch: patch,
  }
}
