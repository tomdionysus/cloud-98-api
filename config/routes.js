module.exports.register = function (svr) {
  svr.registerVersion('1')

  // Public session routes
  svr.register('POST', '/session', 'session', { public: true })
  svr.register('POST', '/session/refresh', 'session_refresh', { public: true })

  svr.register('GET', '/session', 'session')
  svr.register('PATCH', '/session', 'session')
  svr.register('DELETE', '/session', 'session')

  // Reset Password
  svr.register('POST','/password/forgot', 'forgot_password', { public: true })
  svr.register('POST','/password/reset', 'reset_password', { public: true })

  // Signup Routes
  svr.register('POST','/signup/worker', 'signup/worker', { public: true })
  svr.register('POST','/signup/employer', 'signup/employer', { public: true })

  // OAuth
  svr.register('POST', '/oauth/login', 'oauth2/login', { public: true })
  // svr.register('GET', '/oauth/callback', 'oauth2/callback', { public: true })

  // -------- Common Routes ---------

  // - System Status
  svr.register('GET', '/status', 'status')

  // - Current User
  svr.register('GET', '/user', 'user')

  // -- Password
  svr.register('PATCH', '/user', 'user')

  svr.registerCRUD('/vpc', 'vpc', 'CRUIPD')
  svr.registerCRUD('/vpc/{vpc_id}/subnet', 'subnet', 'CRUID')

  // ---------- Admin Routes ----------
  svr.registerCheckHasAnyRole('/admin', 'CRIUPDX', ['admin'])
  svr.registerClearScopes('/admin', ['organisation_id','user_id','account_id'])
  svr.register('POST', '/admin/user', 'user')
  svr.registerCRUD('/admin/user', 'user', 'RUID', { presenters: { user: 'user_full' }})
  svr.register('POST', '/admin/organisation', 'organisation')
  svr.register('POST', '/admin/organisation/{organisation_id}/verify', 'verify_organisation')
  svr.registerCRUD('/admin/organisation', 'organisation', 'RUID', { presenters: { organisation: 'organisation_full' }})
  svr.register('POST','/admin/organisation_user', 'organisation_user')
  svr.registerCRUD('/admin/organisation_user', 'organisation_user', 'RUID')
}


// registerScope(route, paramName, scopeName)
// registerScopeCheckEntityExists(route, paramName, entityName, scopeName, entityIdFieldName, scopeParamName)
// registerScopeCheckUserScopeMatches(route, userScopeName, scopeName)
// registerCheckHasAnyRole(route, crudString, roles)
