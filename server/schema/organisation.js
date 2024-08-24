module.exports = (Table) => {
  const t = new Table('organisation')

  t.description('Represents an organisation')

  t.FieldBigIntPrimaryKey('id')
  t.FieldVarchar('name').nullable(false).length(128)
  t.FieldVarchar('description').nullable(false).length(256).default('')
  t.FieldBigInt('image_id').unsigned().nullable(true)

  t.FieldEnum('status', ['created', 'verified', 'hold']).nullable(false).default('created')

  t.hasMany('organisation_user')
  t.hasManyThrough('user', 'organisation_user')

  return t
}
