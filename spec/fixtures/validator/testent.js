const ValidatorObject = requireServer('ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONString('test', false)
  post.JSONInteger('test2', true)
  const p2 = post.JSONObject('subobj', false)
  p2.JSONNumber('testnum')

  const get = new ValidatorObject({context: context, type: 'object'})
  get.JSONInteger('test2', true)

  return {
    post: post,
    get: get
  }
}
