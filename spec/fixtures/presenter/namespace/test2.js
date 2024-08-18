module.exports = (Presenter) => {
  const p = new Presenter(null, null, 'object')

  p.JSONUUID('id', false)
  p.JSONString('name', false)
  p.JSONString('email', false)

  return p
}
