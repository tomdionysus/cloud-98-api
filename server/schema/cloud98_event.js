module.exports = (Table) => {
  const t = new Table('cloud98_event')

  t.description('Represents a cloud98 system event')

  t.FieldBigIntPrimaryKey('id')
  t.FieldBigInt('user_id').unsigned().nullable(true)
  t.FieldBigInt('organisation_id').unsigned().nullable(true)
  t.FieldVarchar('event_type').length(64).nullable(false)
  t.FieldJSON('event_data').nullable(false)
  t.FieldDatetime('created_utc').nullable(false)

  t.indexOn('user_id')
  t.indexOn('organisation_id')
  t.indexOn('event_type')
  t.indexOn('created_utc')

  t.hasOne('user')
  t.hasOne('organisation')

  return t
}