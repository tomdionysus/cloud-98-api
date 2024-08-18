const _ = require('underscore')
const moment = require('moment')

class PresenterObject {
  constructor (name, type, presenter, options) {
    options = options || {}
    this.options = options
    this.name = name || ''
    this.type = type || 'object'
    this.presenter = presenter
    this.fields = {}
  }

  JSONObject (name, presenter) {
    this.fields[name] = presenter || new PresenterObject(name, 'object', presenter)
    return this.fields[name]
  }

  JSONArray (name, presenter) {
    this.fields[name] = new PresenterObject(name, 'array', presenter)
    return this.fields[name]
  }

  JSONVariant (name) {
    this.fields[name] = new PresenterObject(name, 'variant')
    return this.fields[name]
  }

  JSONDate (name) {
    this.fields[name] = new PresenterObject(name, 'date')
    return this.fields[name]
  }

  JSONDateTime (name) {
    this.fields[name] = new PresenterObject(name, 'datetime')
    return this.fields[name]
  }

  JSONEnum (name, values) {
    this.fields[name] = new PresenterObject(name, 'enum', null, { values: values })
    return this.fields[name]
  }

  JSONString (name, options = {}) {
    this.fields[name] = new PresenterObject(name, 'string', null, { maxLength: options.maxLength, minLength: options.minLength })
    return this.fields[name]
  }

  JSONStringInteger (name) {
    this.fields[name] = new PresenterObject(name, 'stringinteger')
    return this.fields[name]
  }

  JSONNumber (name) {
    this.fields[name] = new PresenterObject(name, 'number')
    return this.fields[name]
  }

  JSONStringNumber (name) {
    this.fields[name] = new PresenterObject(name, 'stringnumber')
    return this.fields[name]
  }

  JSONStringBigInt (name) {
    this.fields[name] = new PresenterObject(name, 'stringbigint')
    return this.fields[name]
  }

  JSONBool (name) {
    this.fields[name] = new PresenterObject(name, 'boolean')
    return this.fields[name]
  }

  JSONInteger (name) {
    this.fields[name] = new PresenterObject(name, 'integer')
    return this.fields[name]
  }

  JSONUUID (name) {
    this.fields[name] = new PresenterObject(name, 'uuid', null)
    return this.fields[name]
  }

  JSONEmail (name) {
    this.fields[name] = new PresenterObject(name, 'email', null)
    return this.fields[name]
  }

  JSONStringJSON(name, options = {}) {
    this.fields[name] = new PresenterObject(name, 'stringjson', null)
    return this.fields[name]
  }

  present (data) {
    if (data === null || typeof (data) === 'undefined') return null
    // if (typeof (data) === 'undefined') throw new Error('present: data is undefined for '+this.name)

    let out = data; let i; let d

    switch (this.type) {
      case 'object':
        if (!_.isObject(data)) {
          out = null
          break
        }
        out = {}
        for (i in this.fields) {
          out[i] = this.fields[i].present(data[i])
        }
        break
      case 'array':
        if (!_.isArray(data)) {
          out = null
          break
        }
        if (!this.presenter) {
          // No presenter so the data just gets passed on
          break
        }
        out = []
        for (i in data) {
          out.push(this.presenter.present(data[i]))
        }
        break
      case 'variant':
        break
      case 'string':
        out = data.toString()
        break
      case 'number':
        out = Number(data)
        break
      case 'stringnumber':
        out = Number(data).toString()
        break
      case 'integer':
        out = parseInt(data)
        break
      case 'stringinteger':
        out = parseInt(data).toString()
        break
      case 'stringbigint':
        out = BigInt(data).toString()
        break
      case 'boolean':
        out = data === true
        break
      case 'date':
        try {
          d = moment(data, 'YYYY-MM-DD')
          out = d.format('YYYY-MM-DD')
        } catch (e) {
          // So What
        }
        break
      case 'datetime':
        try {
          d = moment(data, 'YYYY-MM-DDTHH:mm:ssZ')
          out = d.toISOString()
        } catch (e) {
          // So What
        }
        break
      case 'enum':
        if (!_.isString(data) || this.options.values.indexOf(data) === -1) {
          out = null
        } else {
          out = data
        }
        break
      case 'uuid':
        if (!data.toString().match(/[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/)) {
          out = null
        } else {
          out = data
        }
        break
      case 'email':
        if (!data.toString().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
          out = null
        } else {
          out = data
        }
        break
      case 'stringjson':
        try {
          out = JSON.parse(data)
        } catch(e) {
          this.logger.warn('Could not parse JSON data for '+this.name)
          out = null
        }
        break
    }
    return out
  }
}

module.exports = PresenterObject
