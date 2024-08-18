module.exports = function (PresenterObject) {
  const p = new PresenterObject(null, null, 'object')

  p.JSONStringBigInt('id')
  p.JSONString('name')
  p.JSONString('description')
  p.JSONStringBigInt('account_id')
  p.JSONStringBigInt('image_id')
  p.JSONString('invoicing_email')
  p.JSONString('xero_key')
  p.JSONString('status')
  p.JSONString('billing')

  return p
}
