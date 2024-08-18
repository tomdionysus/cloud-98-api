module.exports = (Table) => {
  const t = new Table('vpc')

  t.description('Represents virtual private cloud')

  t.FieldBigIntPrimaryKey('id')

  t.FieldVarchar('name').length(1024).nullable(false)
  t.FieldVarchar('cidr').length(18).nullable(false)
  t.FieldBigInt('organisation_id').unsigned().nullable(false)

  t.scopedBy('organisation')

  t.indexOn('cidr')
  
  t.indexOn('organisation_id')

  t.hasOne('organisation')
  t.hasMany('subnet')

  return t
}
