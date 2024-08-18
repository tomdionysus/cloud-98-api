const ValidatorObject = require('../lib/ValidatorObject')

describe('Validator', () => {
  it('should allow New', () => {
    const x1 = new ValidatorObject({name:'test'})
    const x2 = new ValidatorObject({name:'test'})

    expect(x1).not.toBe(x2)
  })
})

describe('Object', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('one', false)
    x1.JSONString('two', true)

    const data = {
      one: 1,
      three: 'four'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(2)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING', msg: 'The field `one` should be a string', ref: 'one' })
    expect(errs[1]).toEqual({ code: 'FIELD_DOES_NOT_EXIST', msg: 'The field `three` does not exist', ref: 'three' })
  })

  it('should return error when required fields missing', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('one', false)
    x1.JSONString('two', true)

    const data = {
      three: 'four'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(2)
    expect(errs[0]).toEqual({ code: 'FIELD_DOES_NOT_EXIST', msg: 'The field `three` does not exist', ref: 'three' })
    expect(errs[1]).toEqual({ code: 'FIELD_REQUIRED', msg: 'The field `one` is required', ref: 'one' })
  })

  it('should return error when missing or invalid and respect free fields', () => {
    const x1 = new ValidatorObject({}).allowUndefinedFields()

    x1.JSONString('one', false)
    x1.JSONString('two', true)

    const data = {
      one: 1,
      three: 'four'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING', msg: 'The field `one` should be a string', ref: 'one' })
  })

  it('should return error when missing or invalid subobject', () => {
    const x1 = new ValidatorObject({}).allowUndefinedFields()

    x1.JSONString('one', false)
    x1.JSONString('two', true)
    const x2 = x1.JSONObject('sub', false)

    x2.JSONString('three', true)

    const data = {
      one: 1,
      three: 'four',
      sub: true
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(2)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING', msg: 'The field `one` should be a string', ref: 'one' })
    expect(errs[1]).toEqual({ code: 'FIELD_NOT_OBJECT', msg: 'The field `sub` should be an object', ref: 'sub' })
  })
})

describe('Array', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONArray('two', false)

    const data = {
      two: 'four'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_ARRAY', msg: 'The field `two` should be an array', ref: 'two' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONArray('two', false)

    const data = {
      two: [1, 2, 3]
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })

  it('should validate elements of array with validator if supplied', () => {
    const strValidator = new ValidatorObject({optional: false, type: 'string'})
    const x1 = new ValidatorObject({name: 'test', optional: false, type: 'array', validator: strValidator})

    const data = [
      1,
      'three',
      2
    ]

    const errs = x1.validate(data)

    expect(errs.length).toEqual(2)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING', msg: 'The field `test[0]` should be a string', ref: 'test[0]' })
    expect(errs[1]).toEqual({ code: 'FIELD_NOT_STRING', msg: 'The field `test[2]` should be a string', ref: 'test[2]' })
  })
})

describe('String', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('one', false)
    x1.JSONString('two', true)

    const data = {
      one: 1,
      three: 'four'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(2)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING', msg: 'The field `one` should be a string', ref: 'one' })
    expect(errs[1]).toEqual({ code: 'FIELD_DOES_NOT_EXIST', msg: 'The field `three` does not exist', ref: 'three' })
  })

  it('should return error when too short', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('two', true, { minLength: 10 })

    const data = {
      two: 'usbcua'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_STRING_TOO_SHORT', msg: 'The field `two` has a minimum length of 10', ref: 'two' })
  })

  it('should return error when string does not confirm to regex', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('two', true, { regex: /[0-9]+/ })

    const data = {
      two: 'usbcua'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_STRING_FORMAT_INVALID', msg: 'The field `two` is not the correct format', ref: 'two' })
  })

  it('should return no error when string does confirm to regex', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('two', true, { regex: /[a-z]+/ })

    const data = {
      two: 'usbcua'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })

  it('should return custom error when string does not confirm to regex', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('two', true, { regex: /[0-9]+/, regexErrorCode: 'CODE', regexErrorMessage: 'MESSAGE' })

    const data = {
      two: 'usbcua'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_STRING_CODE', msg: 'The field `two` MESSAGE', ref: 'two' })
  })

  it('should return error when too long', () => {
    const x1 = new ValidatorObject({})

    x1.JSONString('two', true, { maxLength: 10 })

    const data = {
      two: 'usbcuabscinasc'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_STRING_TOO_LONG', msg: 'The field `two` has a maximum length of 10', ref: 'two' })
  })

  it('should validate nested', () => {
    const x1 = new ValidatorObject({name:'test'})

    x1.JSONString('one', false)
    x1.JSONString('two', true)

    const data = {
      one: 1,
      three: 'four'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(2)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING', msg: 'The field `test.one` should be a string', ref: 'test.one' })
    expect(errs[1]).toEqual({ code: 'FIELD_DOES_NOT_EXIST', msg: 'The field `test.three` does not exist', ref: 'test.three' })
  })
})

describe('Variant', () => {
  it('should call null case for variant', () => {
    const x1 = new ValidatorObject({})

    x1.JSONVariant('one', false)

    const data = {
      one: 3.13
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('Integer', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONInteger('one', false)

    const data = {
      one: 3.13
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_INTEGER', msg: 'The field `one` should be an integer', ref: 'one' })
  })

  it('should return error when greater than maxValue', () => {
    const x1 = new ValidatorObject({})

    x1.JSONInteger('one', false, { maxValue: 2 })

    const data = {
      one: 3
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'NUMBER_TOO_BIG', msg: 'The field `one` is greater than the maximum 2', ref: 'one' })
  })

  it('should return error when less than minValue', () => {
    const x1 = new ValidatorObject({})

    x1.JSONInteger('one', false, { minValue: 5 })

    const data = {
      one: 3
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'NUMBER_TOO_SMALL', msg: 'The field `one` is less than the minimum 5', ref: 'one' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONInteger('one', false)

    const data = {
      one: 3
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })

  it('should return empty array when in range valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONInteger('one', false, { minValue: 0, maxValue: 5 })

    const data = {
      one: 3
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('UUID', () => {
  it('should return error when invalid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONUUID('one', false)

    const data = {
      one: 3.13
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_UUID', msg: 'The field `one` should be a valid UUID (00000000-0000-0000-0000-000000000000)', ref: 'one' })
  })

  it('should return no error when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONUUID('one', false)

    const data = {
      one: '00000000-0000-0000-0000-000000000000'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('Email', () => {
  it('should return error when invalid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONEmail('one', false)

    const data = {
      one: 3.13
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_EMAIL_ADDRESS', msg: 'The field `one` should be an email address', ref: 'one' })
  })

  it('should return no error when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONEmail('one', false)

    const data = {
      one: 'test@apibank.co.nz'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('Number', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONNumber('one', false)

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_NUMBER', msg: 'The field `one` should be an number', ref: 'one' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONNumber('one', false)

    const data = {
      one: 1.22
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })

  it('should return error when greater than maxValue', () => {
    const x1 = new ValidatorObject({})

    x1.JSONNumber('one', false, { maxValue: 2 })

    const data = {
      one: 3
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'NUMBER_TOO_BIG', msg: 'The field `one` is greater than the maximum 2', ref: 'one' })
  })

  it('should return error when less than minValue', () => {
    const x1 = new ValidatorObject({})

    x1.JSONNumber('one', false, { minValue: 5 })

    const data = {
      one: 3
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'NUMBER_TOO_SMALL', msg: 'The field `one` is less than the minimum 5', ref: 'one' })
  })
})

describe('Boolean', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONBool('one', false)

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_BOOLEAN', msg: 'The field `one` should be a boolean', ref: 'one' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONBool('one', false)

    const data = {
      one: false
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('Date', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONDate('one', false)

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_DATE', msg: 'The field `one` should be a valid ISO8601 date', ref: 'one' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONDate('one', false)

    const data = {
      one: '2018-02-01'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('DateTime', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONDateTime('one', false)

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_DATETIME', msg: 'The field `one` should be a valid ISO8601 datetime', ref: 'one' })
  })

  it('should return error when missing or invalid with bad date', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONDateTime('one', '2018-33-33T00:00:00Z')

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_DATETIME', msg: 'The field `one` should be a valid ISO8601 datetime', ref: 'one' })
  })

  it('should return empty array when valid, Zulu', () => {
    const x1 = new ValidatorObject({})

    x1.JSONDateTime('one', false)

    const data = {
      one: '2018-02-01T13:22:21Z'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })

  it('should return empty array when valid, Timezone', () => {
    const x1 = new ValidatorObject({})

    x1.JSONDateTime('one', false)

    const data = {
      one: '2018-02-01T13:22:21+05:00'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })

  it('should return empty array when valid, Timezone', () => {
    const x1 = new ValidatorObject({})

    x1.JSONDateTime('one', false)

    const data = {
      one: '2018-02-01T13:22:21+05:00'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('StringInteger', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONStringInteger('one', false)

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING_INTEGER', msg: 'The field `one` should be an integer encoded as a string', ref: 'one' })
  })

  it('should return error when an invalid string', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONStringInteger('one', false)

    const data = {
      one: '1237123.22'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING_INTEGER', msg: 'The field `one` should be an integer encoded as a string', ref: 'one' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONStringInteger('one', false)

    const data = {
      one: '223723'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('StringBigInt', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONStringBigInt('one', false)

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING_BIGINT', msg: 'The field `one` should be a 64 bit integer encoded as a string', ref: 'one' })
  })

  it('should return error when an invalid string', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONStringBigInt('one', false)

    const data = {
      one: false
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING_BIGINT', msg: 'The field `one` should be a 64 bit integer encoded as a string', ref: 'one' })
  })

  it('should return error when an invalid number in a string', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONStringBigInt('one', false)

    const data = {
      one: '1237123.22'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING_BIGINT', msg: 'The field `one` should be a 64 bit integer encoded as a string', ref: 'one' })
  })

  it('should return error when an invalid number in a string', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONStringBigInt('one', false)

    const data = {
      one: '-2734823823487238422874823748238498723894728374824387.23237'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING_BIGINT', msg: 'The field `one` should be a 64 bit integer encoded as a string', ref: 'one' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONStringBigInt('one', false)

    const data = {
      one: '40000000000'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('StringNumber', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONStringNumber('one', false)

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_STRING_NUMBER', msg: 'The field `one` should be a number encoded as a string', ref: 'one' })
  })

  it('should return empty array when valid decimal', () => {
    const x1 = new ValidatorObject({})
    x1.JSONStringNumber('one', false)

    const data = {
      one: '223723.247123'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONStringNumber('one', false)

    const data = {
      one: '223723'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})

describe('JSONEnum', () => {
  it('should return error when missing or invalid', () => {
    const x1 = new ValidatorObject({})
    x1.allowUndefinedFields(true)

    x1.JSONEnum('one', false, ['x', 'y', 'z'])

    const data = {
      one: 'a'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(1)
    expect(errs[0]).toEqual({ code: 'FIELD_NOT_VALID_ENUM', msg: 'The field `one` should be a string and one of [x,y,z]', ref: 'one' })
  })

  it('should return empty array when valid', () => {
    const x1 = new ValidatorObject({})

    x1.JSONEnum('one', false, ['x', 'y', 'z'])

    const data = {
      one: 'x'
    }

    const errs = x1.validate(data)

    expect(errs.length).toEqual(0)
  })
})
