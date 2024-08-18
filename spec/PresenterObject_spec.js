const PresenterObject = require('../lib/PresenterObject')

describe('PresenterObject', () => {
  let x1

  beforeEach(() => {
    x1 = new PresenterObject('field')
  })

  describe('JSONObject', () => {
    it('Should create an object presenter with the supplied field name', () => {
      const result = x1.JSONObject('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('object')

      expect(x1.fields.FIELD).toBe(result)
    })

    it('Should use supplied presenter with supplied field name', () => {
      const underpres = new PresenterObject('FIELD2', false, 'variant')
      const result = x1.JSONObject('FIELD', underpres)

      expect(x1.fields.FIELD).toBe(result)
      expect(x1.fields.FIELD).toBe(underpres)
    })
  })

  describe('JSONArray', () => {
    it('Should create an array presenter with the supplied field name', () => {
      const result = x1.JSONArray('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('array')
      expect(result.presenter).toBeUndefined()

      expect(x1.fields.FIELD).toBe(result)
    })

    it('Should create an array presenter with the supplied presenter with supplied field name', () => {
      const underpres = new PresenterObject('FIELD2', false, 'variant')
      const result = x1.JSONArray('FIELD', underpres)

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('array')
      expect(result.presenter).toBe(underpres)
    })
  })

  describe('JSONVariant', () => {
    it('Should create a variant presenter with the supplied field name', () => {
      const result = x1.JSONVariant('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('variant')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONDate', () => {
    it('Should create a date presenter with the supplied field name', () => {
      const result = x1.JSONDate('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('date')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONDateTime', () => {
    it('Should create a datetime presenter with the supplied field name', () => {
      const result = x1.JSONDateTime('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('datetime')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONEnum', () => {
    it('Should create a enum presenter with the supplied field name', () => {
      const result = x1.JSONEnum('FIELD', ['value1', 'value2'])

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('enum')
      expect(result.options.values).toEqual(['value1', 'value2'])

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONString', () => {
    it('Should create a string presenter with the supplied field name', () => {
      const result = x1.JSONString('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('string')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONStringInteger', () => {
    it('Should create a string integer presenter with the supplied field name', () => {
      const result = x1.JSONStringInteger('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('stringinteger')

      expect(x1.fields.FIELD).toBe(result)
    })
  })
  describe('JSONNumber', () => {
    it('Should create a number presenter with the supplied field name', () => {
      const result = x1.JSONNumber('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('number')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONStringNumber', () => {
    it('Should create a string number presenter with the supplied field name', () => {
      const result = x1.JSONStringNumber('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('stringnumber')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONStringBigInt', () => {
    it('Should create a bigint presenter with the supplied field name', () => {
      const result = x1.JSONStringBigInt('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('stringbigint')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONBool', () => {
    it('Should create a bool presenter with the supplied field name', () => {
      const result = x1.JSONBool('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('boolean')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONInteger', () => {
    it('Should create a integer presenter with the supplied field name', () => {
      const result = x1.JSONInteger('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('integer')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONUUID', () => {
    it('Should create a UUID presenter with the supplied field name', () => {
      const result = x1.JSONUUID('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('uuid')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('JSONEmail', () => {
    it('Should create an email presenter with the supplied field name', () => {
      const result = x1.JSONEmail('FIELD')

      expect(result).toEqual(jasmine.any(PresenterObject))
      expect(result.name).toEqual('FIELD')
      expect(result.type).toEqual('email')

      expect(x1.fields.FIELD).toBe(result)
    })
  })

  describe('present', () => {
    it('Should present null as null', () => {
      const data = null
      x1.JSONObject('two')

      const res = x1.present(data)

      expect(res).toBeNull()
    })

    xit('Should throw on undefined', () => {
      const data = undefined
      x1.JSONObject('two')

      expect(() => {
        const res = x1.present(data)
      }).toThrow(Error('present: data is undefined for field'))
    })

    it('Should present objects properly', () => {
      const data = { one: 1, two: { 2: 'TWO' }, three: 3.14 }
      const field = new PresenterObject(2, 'variant')
      x1.JSONObject('two', field)

      const res = x1.present(data)

      expect(res).toEqual({ two: { 2: 'TWO' } })
    })

    it('Should present null when object field is not an object', () => {
      const data = 32423784
      const field = new PresenterObject(2, 'object')
      x1.JSONObject('two', field)

      const res = x1.present(data)

      expect(res).toBeNull()
    })

    it('Should present arrays properly', () => {
      const data = { one: 1, two: [2], three: 3.14 }
      const field = new PresenterObject(2, 'variant')
      x1.JSONArray('two', field)

      const res = x1.present(data)

      expect(res).toEqual({ two: [2] })
    })

    it('Should present null when array field is not an array', () => {
      const data = { one: 1, two: 23498324, three: 3.14 }
      const field = new PresenterObject(2, 'variant')
      x1.JSONArray('two', field)

      const res = x1.present(data)

      expect(res).toEqual({ two: null })
    })

    it('Should passs through array data if there is no presenter', () => {
      const data = { one: 1, two: [2, 3, 4, { five: 5 }, 6], three: 3.14 }
      x1.JSONArray('two')

      const res = x1.present(data)

      expect(res).toEqual({ two: [2, 3, 4, { five: 5 }, 6] })
    })

    it('Should present string properly', () => {
      const data = 2
      const field = new PresenterObject(2, 'string')

      const res = field.present(data)

      expect(res).toBe('2')
    })

    it('Should present number properly', () => {
      const data = '2'
      const field = new PresenterObject(2, 'number')

      const res = field.present(data)

      expect(res).toBe(2)
    })

    it('Should present stringnumber properly', () => {
      const data = '2.122'
      const field = new PresenterObject(2, 'stringnumber')

      const res = field.present(data)

      expect(res).toBe('2.122')
    })

    it('Should present integer properly', () => {
      const data = '2.122'
      const field = new PresenterObject(2, 'integer')

      const res = field.present(data)

      expect(res).toBe(2)
    })

    it('Should present stringinteger properly', () => {
      const data = '2.122'
      const field = new PresenterObject(2, 'stringinteger')

      const res = field.present(data)

      expect(res).toBe('2')
    })

    it('Should present stringbigint properly', () => {
      const data = BigInt('-82731873812387128371823718213123')
      const field = new PresenterObject(2, 'stringbigint')

      const res = field.present(data)

      expect(res).toBe('-82731873812387128371823718213123')
    })

    it('Should present boolean false properly', () => {
      const data = 0
      const field = new PresenterObject(2, 'boolean')

      const res = field.present(data)

      expect(res).toBe(false)
    })

    it('Should present boolean true properly', () => {
      const data = true
      const field = new PresenterObject(2, 'boolean')

      const res = field.present(data)

      expect(res).toBe(true)
    })

    it('Should present date properly ISO8601', () => {
      const data = new Date('2019-03-29')
      const field = new PresenterObject(2, 'date')

      const res = field.present(data)

      expect(res).toBe('2019-03-29')
    })

    it('Should present datetime properly ISO8601', () => {
      const data = new Date('2019-03-29T00:14:15Z')
      const field = new PresenterObject(2, 'datetime')

      const res = field.present(data)

      expect(res).toBe('2019-03-29T00:14:15.000Z')
    })

    it('Should present enum value', () => {
      const data = 'one'
      const field = new PresenterObject(2, 'enum', null, { values: ['one', 'two'] })

      const res = field.present(data)

      expect(res).toBe('one')
    })

    it('Should present null when enum value is not valid', () => {
      const data = 'five'
      const field = new PresenterObject(2, 'enum', null, { values: ['one', 'two'] })

      const res = field.present(data)

      expect(res).toBeNull()
    })

    it('Should present UUID value', () => {
      const data = '00000000-0000-0000-0000-000000000000'
      const field = new PresenterObject(2, 'uuid')

      const res = field.present(data)

      expect(res).toBe('00000000-0000-0000-0000-000000000000')
    })

    it('Should present null when UUID value is not valid', () => {
      const data = '00000000-0000-0000-000000000000'
      const field = new PresenterObject(2, 'uuid')

      const res = field.present(data)

      expect(res).toBeNull()
    })

    it('Should present email value', () => {
      const data = 'test@blackraven.co.nz'
      const field = new PresenterObject(2, 'email')

      const res = field.present(data)

      expect(res).toBe('test@blackraven.co.nz')
    })

    it('Should present null when email value is not valid', () => {
      const data = 'test@blackraven'
      const field = new PresenterObject(2, 'email')

      const res = field.present(data)

      expect(res).toBeNull()
    })
  })
})
