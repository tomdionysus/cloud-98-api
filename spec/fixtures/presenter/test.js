module.exports = (Presenter) => {
  const p = new Presenter(null, null, 'object')

  p.JSONUUID('id', false)
  p.JSONString('name')
  p.JSONString('email', true)

  return p
}
