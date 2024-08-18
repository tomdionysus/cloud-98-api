const ValidatorObject = requireServer('ValidatorObject')

module.exports = function (context) {
  // Test, Array of integers: { test: [ int ] }
  const arrVal = new ValidatorObject({context: context, type: 'integer'})

  const post = new ValidatorObject({context: context, type: 'object'})
  post.JSONArray('test', false, arrVal)

  return {
    post: post
  }
}
