module.exports = function (PresenterObject) {
  const p = new PresenterObject(null, null, 'object')

  p.JSONStringBigInt('id')
  p.JSONString('name')
  p.JSONString('cidr')
  p.JSONStringBigInt('vpc_id')

  return p
}
