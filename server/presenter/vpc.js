module.exports = function (PresenterObject) {
  const p = new PresenterObject(null, null, 'object')

  p.JSONStringBigInt('id')
  p.JSONString('name')
  p.JSONString('cidr')

  return p
}
