const _ = require('underscore')
const moment = require('moment')
const bankAccountValidator = require('@fnzc/nz-bank-account-validator')
const irdValidator = require('@fnzc/nz-ird-validator')

class ValidatorObject {
  constructor ({context, name, optional, type, validator, options}) {
    this.context = context
    this.options = options || {}
    this.name = name || ''
    this.optional = optional
    this.type = type || 'object'
    this.validator = validator
    this.fields = {}
    this._allowUndefinedFields = this.options.allowUndefinedFields || false
  }

  allowUndefinedFields (val) {
    if (val === undefined) { val = true }
    this._allowUndefinedFields = val
    return this
  }

  JSONObject (name, optional, validator) {
    if (validator) validator.name = name
    this.fields[name] = validator || new ValidatorObject({context: this.context, name: name, optional: optional, type: 'object'})
    return this.fields[name]
  }

  JSONArray (name, optional, validator) {
    if (validator) validator.name = name
    this.fields[name] = validator || new ValidatorObject({context: this.context, name: name, optional: optional, type: 'array'})
    return this.fields[name]
  }

  JSONVariant (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'variant'})
    return this.fields[name]
  }

  JSONDate (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'date'})
    return this.fields[name]
  }

  JSONDateTime (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'datetime'})
    return this.fields[name]
  }

  JSONEnum (name, optional, values) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'enum', options: { values: values }})
    return this.fields[name]
  }

  JSONEnumNumber (name, optional, values) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'enumnumber', options: { values: values }})
    return this.fields[name]
  }

  JSONString (name, optional, options = {}) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'string', options: { maxLength: options.maxLength, minLength: options.minLength, regex: options.regex, regexErrorCode: options.regexErrorCode, regexErrorMessage: options.regexErrorMessage }})
    return this.fields[name]
  }

  JSONStringInteger (name, optional, options = {}) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'stringinteger', options: { maxValue: options.maxValue, minValue: options.minValue }})
    return this.fields[name]
  }

  JSONStringBigInt (name, optional, options = {}) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'stringbigint', options: { maxValue: options.maxValue, minValue: options.minValue }})
    return this.fields[name]
  }

  JSONNumber (name, optional, options = {}) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'number', options: { maxValue: options.maxValue, minValue: options.minValue }})
    return this.fields[name]
  }

  JSONStringNumber (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'stringnumber'})
    return this.fields[name]
  }

  JSONBool (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'boolean'})
    return this.fields[name]
  }

  JSONInteger (name, optional, options = {}) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'integer', options: { maxValue: options.maxValue, minValue: options.minValue }})
    return this.fields[name]
  }

  JSONUUID (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'uuid'})
    return this.fields[name]
  }

  JSONEmail (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'email'})
    return this.fields[name]
  }

  JSONStringNZBankAccount (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'nzbankaccount'})
    return this.fields[name]
  }

  JSONStringNZIRDNumber (name, optional) {
    this.fields[name] = new ValidatorObject({context: this.context, name: name, optional: optional, type: 'nzirdnumber'})
    return this.fields[name]
  }

  static stripdots (val) {
    while (val.substr(0, 1) === '.') { val = val.substr(1) }
    while (val.substr(val.length - 1, 1) === '.') { val = val.substr(0, val.length - 1) }
    return val
  }

  validate (data, path) {
    path = ValidatorObject.stripdots((path || '') + '.' + this.name)

    let errs = []

    let valid

    if (data === undefined || data === null) {
      if (!this.optional) {
        errs.push({ code: 'FIELD_REQUIRED', msg: 'The field `' + path + '` is required', ref: path })
        return errs
      } else {
        return []
      }
    }

    let keys, dataint

    switch (this.type) {
      case 'object':
        if (!_.isObject(data)) {
          errs.push({ code: 'FIELD_NOT_OBJECT', msg: 'The field `' + path + '` should be an object', ref: path })
          break
        }
        keys = _.union(_.keys(data), _.keys(this.fields))
        for (let k in keys) {
          k = keys[k]
          if (!this.fields[k]) {
            if (!this._allowUndefinedFields) {
              errs.push({ code: 'FIELD_DOES_NOT_EXIST', msg: 'The field `' + ValidatorObject.stripdots(path + '.' + k) + '` does not exist', ref: ValidatorObject.stripdots(path + '.' + k) })
            }
          } else {
            errs = errs.concat(this.fields[k].validate(data[k], path))
          }
        }
        break
      case 'array':
        if (!_.isArray(data)) {
          errs.push({ code: 'FIELD_NOT_ARRAY', msg: 'The field `' + path + '` should be an array', ref: path })
          break
        }
        if (!this.validator) { break }
        for (const i in data) {
          errs = errs.concat(this.validator.validate(data[i], path + '[' + i + ']'))
        }
        break
      case 'variant':
        // Null case, just needs to exist.
        break
      case 'string':
        if (!_.isString(data)) {
          errs.push({ code: 'FIELD_NOT_STRING', msg: 'The field `' + path + '` should be a string', ref: path })
        } else if (this.options.maxLength && data.length > this.options.maxLength) {
          errs.push({ code: 'FIELD_STRING_TOO_LONG', msg: 'The field `' + path + '` has a maximum length of ' + this.options.maxLength, ref: path })
        } else if (this.options.minLength && data.length < this.options.minLength) {
          errs.push({ code: 'FIELD_STRING_TOO_SHORT', msg: 'The field `' + path + '` has a minimum length of ' + this.options.minLength, ref: path })
        } else if (this.options.regex && !data.toString().match(this.options.regex)) {
          errs.push({ code: 'FIELD_STRING_' + (this.options.regexErrorCode || 'FORMAT_INVALID'), msg: 'The field `' + path + '` ' + (this.options.regexErrorMessage || 'is not the correct format'), ref: path })
        }
        break
      case 'number':
        if (!_.isNumber(data)) {
          errs.push({ code: 'FIELD_NOT_NUMBER', msg: 'The field `' + path + '` should be an number', ref: path })
        } else if (this.options.maxValue !== undefined && data > this.options.maxValue) {
          errs.push({ code: 'NUMBER_TOO_BIG', msg: 'The field `' + path + '` is greater than the maximum ' + this.options.maxValue, ref: path })
        } else if (this.options.minValue !== undefined && data < this.options.minValue) {
          errs.push({ code: 'NUMBER_TOO_SMALL', msg: 'The field `' + path + '` is less than the minimum ' + this.options.minValue, ref: path })
        }
        break
      case 'stringnumber':
        if (!_.isString(data) || parseFloat(data).toString() !== data) {
          errs.push({ code: 'FIELD_NOT_STRING_NUMBER', msg: 'The field `' + path + '` should be a number encoded as a string', ref: path })
        }
        break
      case 'integer':
        if (!_.isNumber(data) || Math.round(data) !== data) {
          errs.push({ code: 'FIELD_NOT_INTEGER', msg: 'The field `' + path + '` should be an integer', ref: path })
        } else if (this.options.maxValue !== undefined && data > this.options.maxValue) {
          errs.push({ code: 'NUMBER_TOO_BIG', msg: 'The field `' + path + '` is greater than the maximum ' + this.options.maxValue, ref: path })
        } else if (this.options.minValue !== undefined && data < this.options.minValue) {
          errs.push({ code: 'NUMBER_TOO_SMALL', msg: 'The field `' + path + '` is less than the minimum ' + this.options.minValue, ref: path })
        }
        break
      case 'stringinteger':
        dataint = parseInt(data)
        if (!_.isString(data) || dataint.toString() !== data || Math.round(dataint) !== dataint) {
          errs.push({ code: 'FIELD_NOT_STRING_INTEGER', msg: 'The field `' + path + '` should be an integer encoded as a string', ref: path })
        }
        break
      case 'stringbigint':
        valid = false
        if (!_.isString(data) || data.length===0) {
          valid = false
        } else {
          try {
            BigInt(data).toString()
            valid = true
          } catch (e) {
            // So What
          }
        }
        if (!valid) {
          errs.push({ code: 'FIELD_NOT_STRING_BIGINT', msg: 'The field `' + path + '` should be a 64 bit integer encoded as a string', ref: path })
        }
        break
      case 'boolean':
        if (!_.isBoolean(data)) {
          errs.push({ code: 'FIELD_NOT_BOOLEAN', msg: 'The field `' + path + '` should be a boolean', ref: path })
        }
        break
      case 'date':
        valid = false
        if (!data.match(/(\d{4})-(\d{2})-(\d{2})/)) {
          valid = false
        } else {
          try {
            const d = moment(data, 'YYYY-MM-DD')
            valid = d.isValid()
          } catch (e) {
            // So What
          }
        }
        if (!valid) {
          errs.push({ code: 'FIELD_NOT_DATE', msg: 'The field `' + path + '` should be a valid ISO8601 date', ref: path })
        }
        break

      case 'datetime':
        valid = false
        if (!data.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?(Z|[+-](\d{2}):(\d{2}))/)) {
          valid = false
        } else {
          try {
            const datetime = moment(data)
            valid = datetime.isValid()
          } catch (e) {
            // So What
          }
        }
        if (!valid) {
          errs.push({ code: 'FIELD_NOT_DATETIME', msg: 'The field `' + path + '` should be a valid ISO8601 datetime', ref: path })
        }
        break

      case 'enum':
        if (!_.isString(data) || this.options.values.indexOf(data) === -1) {
          errs.push({ code: 'FIELD_NOT_VALID_ENUM', msg: 'The field `' + path + '` should be a string and one of [' + this.options.values.join(',') + ']', ref: path })
        }
        break

      case 'enumnumber':
        if (!_.isNumber(data) || this.options.values.indexOf(data) === -1) {
          errs.push({ code: 'FIELD_NOT_VALID_ENUM_NUMBER', msg: 'The field `' + path + '` should be a number and one of [' + this.options.values.join(',') + ']', ref: path })
        }
        break

      case 'uuid':
        valid = false
        if (!data.toString().match(/[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/)) {
          errs.push({ code: 'FIELD_NOT_UUID', msg: 'The field `' + path + '` should be a valid UUID (00000000-0000-0000-0000-000000000000)', ref: path })
        }
        break

      case 'email':
        valid = false
        if (!data.toString().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
          errs.push({ code: 'FIELD_NOT_EMAIL_ADDRESS', msg: 'The field `' + path + '` should be an email address', ref: path })
        }
        break

      case 'nzbankaccount':
        if(!bankAccountValidator.isValidNZBankNumber.apply(bankAccountValidator, data.toString().split('-'))) {
          errs.push({ code: 'FIELD_NOT_NZ_BANK_ACCOUNT_NUMBER', msg: 'The field `' + path + '` should be a valid New Zealand Bank Account Number', ref: path })
        }
        break

      case 'nzirdnumber':
        if (!irdValidator.isValidIRDNumber(data.toString())) {
          errs.push({ code: 'FIELD_NOT_NZ_IRD_NUMBER', msg: 'The field `' + path + '` should be a New Zealand IRD Number', ref: path })
        }
        break
    }
    return errs
  }

  openAPIComponent () {
    const out = {
      type: 'object',
      required: [],
      properties: {}
    }
    for (const i in this.fields) {
      const field = this.fields[i]
      out.properties[field.name] = ValidatorObject.mapOpenAPIType(field)
      if (!field.optional) out.required.push(field.name)
    }
    return out
  }

  static mapOpenAPIType (field) {
    switch (field.type) {
      case 'uuid':
        return { $ref: '#/components/schemas/uuid' }
      case 'stringbigint':
        return { $ref: '#/components/schemas/bigint' }
      default:
        return { type: field.type }
    }
  }
}

module.exports = ValidatorObject
