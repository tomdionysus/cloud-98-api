const ValidatorObject = require('../../lib/ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONString('first_name', false, { minLength: 3, maxLength: 128 })
  post.JSONString('last_name', false, { minLength: 3, maxLength: 128 })
  post.JSONString('email', false)
  post.JSONString('phone', true, { maxLength: 32 })
  post.JSONString('country', true, { minLength: 2, maxLength: 2 })
  
  post.JSONEnum('email_details', true, ['Y','N'])
  post.JSONEnum('email_contract', true, ['Y','N'])

  const patch = new ValidatorObject({context: context, type: 'object'})
  patch.JSONStringBigInt('image_id', true)
  patch.JSONString('first_name', true, { minLength: 3, maxLength: 128 })
  patch.JSONString('last_name', true, { minLength: 3, maxLength: 128 })
  patch.JSONEmail('email', true)
  patch.JSONString('phone', true, { maxLength: 32 })
  patch.JSONString('country', true, { minLength: 2, maxLength: 2 })
  patch.JSONString('bank_account', true)
  patch.JSONString('tax_code', true)
  patch.JSONString('ird_number', true)
  patch.JSONInteger('kiwisaver_percent', true)
  patch.JSONInteger('paysauce_id', true)

  patch.JSONString('password', true)

  const invite = new ValidatorObject({context: context, type: 'object'})
  invite.JSONEmail('email', false)

  const patch_password = new ValidatorObject({context: context, type: 'object'})
  patch_password.JSONString('password', true, { minLength: 8, maxLength: 128 })
  patch_password.JSONString('new_password', false, { minLength: 8, maxLength: 128 })

  const reset_password = new ValidatorObject({context: context, type: 'object'})
  reset_password.JSONString('reset_code', true, { minLength: 32, maxLength: 32 })
  reset_password.JSONString('new_password', false, { minLength: 8, maxLength: 128 })

  return {
    post: post,
    patch: patch,
    invite: invite,
    patch_password: patch_password,
    reset_password: reset_password,
  }
}
