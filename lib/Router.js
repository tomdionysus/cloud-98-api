const async = require('async')

// Router represents defined HTTP path routes for an application. Router supports
// wildcard and parameters in routes.
//
// Each route is associated with a set of callbacks, which will be executed in the order
// defined by register. In addition, if a partial route is defined as part of another
// route, its callbacks will also be invoked.
class Router {
  constructor () {
    this.root = {
      segments: {},
      callbacks: {},
      params: {},
      wildcard: null
    }
  }

  // register(path, callback)
  // - Registers a route to a callback. Route can contain wildcards (*)
  // -- verb = string   --- The verb on callback, or *
  // -- path = string   --- The path of the route, e.g. /path/to/something
  // -- callback = function(error) --- Return a non-null error to discontinue processing
  register (verb, path, handler) {
    // Rationalise verb
    verb = verb || '*'
    verb = verb.toLowerCase()

    // Remove leading '/'
    path = path.trim()
    while (path[0] === '/') path = path.substr(1)

    // Break it up
    const seg = path.split('/')

    // Special Case root
    if (seg.length === 1 && seg[0] === '') {
      this.root.callbacks[verb] = this.root.callbacks[verb] || []
      this.root.callbacks[verb].push(handler)
      return
    }
    // Normal Route
    let current = this.root
    for (let i = 0; i < seg.length; i++) {
      const segtext = seg[i]
      if (segtext.substr(0, 1) === '{') {
        // Parameter
        current.params.push(segtext.substr(1, segtext.length - 2).trim())
        if (!current.paramSegment) {
          current.paramSegment = {
            segments: {},
            callbacks: {},
            params: [],
            paramSegment: null,
            wildcard: null
          }
        }
        current = current.paramSegment
      } else if (segtext === '*') {
        // Wildcard
        if (!current.wildcard) {
          current.wildcard = {
            segments: {},
            callbacks: {},
            params: [],
            paramSegment: null,
            wildcard: null
          }
        }
        current = current.wildcard
      } else {
        // Normal Segment
        if (!current.segments[segtext]) {
          current.segments[segtext] = {
            segments: {},
            callbacks: {},
            params: [],
            paramSegment: null,
            wildcard: null
          }
        }
        current = current.segments[segtext]
      }
    }
    current.callbacks[verb] = current.callbacks[verb] || []
    current.callbacks[verb].push(handler)
  }

  // route(path, callback)
  // - Process a path, calling all defined route-callbacks. After, call callback.
  // -- path = string   --- The path of the route, e.g. /path/to/something
  // -- context = object   --- A context object to be passed to (and mutated by) the callbacks
  // -- callback = function(path, context, pathParams, error)   --- the function to call when complete
  route (req, res, next) {
    // Rationalise verb
    req.method = (req.method || '*').toLowerCase()

    const segments = req.path.split('/')
    while (segments[0] === '') segments.shift()

    // Init Request Params
    req.params = req.params || {}
    const callbacks = []
    const found = this._route(req, this.root, segments, [], callbacks)

    // There must be at least one non-segway for the route to be 'found'
    let routeIncomplete = true

    async.eachSeries(callbacks,
      (item, callback) => {
        routeIncomplete = routeIncomplete && item.isSegway
        item.fn(req, res, { isSegway: item.isSegway }, callback)
      },
      (err) => {
        if (err) { return next(err) }
        if (routeIncomplete || !found) { return next('NOT_FOUND') }
        next()
      }
    )
  }

  _route (req, current, segments, processed, callbacks) {
    let j
    // Callbacks
    if (current.callbacks[req.method]) {
      // Verb specific callbacks
      for (j = 0; j < current.callbacks[req.method].length; j++) {
        callbacks.push({
          isSegway: segments.length > 0,
          path: '/' + processed.join('/'),
          fn: current.callbacks[req.method][j]
        })
      }
    }
    if (current.callbacks['*']) {
      // Catchall callbacks
      for (j = 0; j < current.callbacks['*'].length; j++) {
        callbacks.push({
          isSegway: segments.length > 0,
          path: '/' + processed.join('/'),
          fn: current.callbacks['*'][j]
        })
      }
    }

    // Get Next Segment
    if (segments.length === 0) { return true }
    const seg = segments.shift()
    processed.push(seg)

    // Normal Route Progression
    if (current.segments[seg]) {
      return this._route(req, current.segments[seg], segments, processed, callbacks)
    }

    // Parameter segment?
    if (current.params.length > 0) {
      // If this is a param load all params into routeparams
      for (j = 0; j < current.params.length; j++) { req.params[current.params[j]] = seg }
      return this._route(req, current.paramSegment, segments, processed, callbacks)
    }

    // Wildcard Segment?
    if (current.wildcard) {
      return this._route(req, current.wildcard, segments, processed, callbacks)
    }

    return false
  }
}

module.exports = Router
