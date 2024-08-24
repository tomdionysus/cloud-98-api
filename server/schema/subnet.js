module.exports = (Table) => {
  const t = new Table('subnet')

  t.description('Represents a VPC subnet')

  t.FieldBigIntPrimaryKey('id')

  t.FieldVarchar('name').length(1024).nullable(false)
  t.FieldVarchar('cidr').length(18).nullable(false)

  t.FieldBigInt('vpc_id').unsigned().nullable(false)
  t.FieldBigInt('organisation_id').unsigned().nullable(false)

  t.hasOne('vpc')

  t.scopedBy('vpc_id')
  t.scopedBy('organisation')

  t.indexOn('vpc_id')
  t.indexOn('organisation_id')

  return t
}