module.exports = function (PresenterObject) {
  const p = new PresenterObject(null, null, 'object')

  p.JSONStringBigInt('id')
  p.JSONStringBigInt('image_id')
  p.JSONString('first_name')
  p.JSONString('last_name')
  p.JSONString('email')
  p.JSONString('has_resume')

  return p
}
