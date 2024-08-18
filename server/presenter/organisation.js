module.exports = function (PresenterObject) {
  const p = new PresenterObject(null, null, 'object')

  p.JSONStringBigInt('id')
  p.JSONString('name')
  p.JSONString('description')
  p.JSONStringBigInt('image_id')

  return p
}
