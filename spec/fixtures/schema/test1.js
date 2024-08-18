module.exports = function (Table) {
  const table = new Table('test1')

  table.FieldUUID('id', false).primaryKey()
  table.FieldVarchar('name', 128, false)

  table.hasOne('test2')
  table.hasMany('test3')
  table.hasManyThrough('test4', 'test5')

  table.scopedBy('test2')
  table.scopedBy('test3')

  return table
}
