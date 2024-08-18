module.exports = function (PresenterObject) {
  const p = new PresenterObject(null, null, 'object')

  p.JSONStringBigInt('id')
  p.JSONStringBigInt('user_id')
  p.JSONStringBigInt('organisation_id')
  p.JSONString('roles')

  return p
}
