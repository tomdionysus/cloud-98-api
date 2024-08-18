const ValidatorObject = requireServer('ValidatorObject')

module.exports = function (context) {
  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONBool('test', false)

  return {
    post: post
  }
}
