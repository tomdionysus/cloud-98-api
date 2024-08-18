module.exports = function (Table) {
  const t = new Table('user')

  t.description('Represents a user that can access the system')

  t.FieldBigIntPrimaryKey('id')
  t.FieldBigInt('image_id').unsigned().nullable(true)

  t.FieldVarchar('first_name').nullable(false).length(128)
  t.FieldVarchar('last_name').nullable(false).length(128)
  t.FieldVarchar('email').nullable(false).length(128)
  t.FieldVarchar('phone').nullable(true).length(32)
  t.FieldChar('country').nullable(false).length(2).default('NZ')
  t.FieldChar('salt').nullable(false).length(128)
  t.FieldChar('pwdsha256').nullable(false).length(64)
  t.FieldEnum('email_confirmed', ['Y', 'N']).nullable(false).default('N')
  t.FieldChar('email_confirm_code').nullable().length(64)
  t.FieldChar('password_reset_code').nullable().length(64)
  t.FieldDatetime('last_signin_at').nullable()
  t.FieldEnum('email_unsubscribed', ['Y', 'N']).nullable(false).default('N')
  t.FieldChar('refresh_token').nullable(true).length(128)
  t.FieldDatetime('refresh_token_expiry_utc').nullable(true)

  t.hasMany('organisation_user')

  t.hasManyThrough('organisation', 'organisation_user')

  t.uniqueIndexOn('email')
  t.indexOn('email', 'email_confirmed')
  t.indexOn('email_confirm_code')
  t.indexOn('password_reset_code')

  return t
}

// NOTE: If you change this, make sure you:
//
// * Update the docs in docs/api and docs/api/resources
// * Regenerate the SQL with bin/updateSchema.js
// * Plan and execute a DB migration in the appropriate environments
