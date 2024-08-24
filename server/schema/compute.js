module.exports = (Table) => {
  const t = new Table('compute')

  t.description('Represents a compute/storage node')

  t.FieldBigIntPrimaryKey('id')

  t.FieldVarchar('ip').length(15).nullable(false)
  t.FieldVarchar('mac').length(14).nullable(false)
  t.FieldSmallInt('vCPU').unsigned().nullable(false)
  t.FieldInteger('memoryKB').unsigned().nullable(false)
  t.FieldInteger('storageKB').unsigned().nullable(false)

  return t
}