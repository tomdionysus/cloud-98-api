module.exports = (Table) => {
  const t = new Table('organisation_user')

  t.description('Links organisations to users')

  t.FieldBigIntPrimaryKey('id')
  t.FieldBigInt('organisation_id').unsigned().nullable(false)
  t.FieldBigInt('user_id').unsigned().nullable(false)
  t.FieldVarchar('roles').nullable(false).length(1024).default('')
  t.FieldEnum('isdefault', ['Y', 'N']).nullable(false).default('N')

  t.hasOne('organisation')
  t.hasOne('user')

  t.scopedBy('user')
  t.scopedBy('organisation')

  t.uniqueIndexOn('organisation_id','user_id')

  return t
}

// NOTE: If you change this, make sure you:
//
// * Update the docs in docs/api and docs/api/resources
// * Regenerate the SQL with bin/updateSchema.js
// * Plan and execute a DB migration in the appropriate environments
