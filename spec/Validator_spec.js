const path = require('path')
const _ = require('underscore')

const Validator = require('../lib/Validator')

describe('Validator', () => {
  it('should allow New', () => {
    const x1 = new Validator('test')
    const x2 = new Validator('test')

    expect(x1).not.toBe(x2)
  })

  it('should have correct defaults', () => {
    const x1 = new Validator()

    expect(x1.path).toEqual(path.join(__dirname, '../server/validator'))
    expect(x1.types).toEqual({})
  })

  describe('load', () => {
    it('should recursively call _load', () => {
      const x1 = new Validator()

      spyOn(x1, '_load')

      x1.load()
      expect(x1._load).toHaveBeenCalledWith(path.join(__dirname, '../server/validator'), {})
    })
  })

  describe('_load', () => {
    it('should load fixtures correctly', () => {
      const x1 = new Validator({ validatorsPath: fixturesDir('validator') })

      x1.load()

      expect(_.keys(x1.types.testent)).toEqual(['post', 'get'])
      expect(_.keys(x1.types.testent.post.fields)).toEqual(['test', 'test2', 'subobj'])
      expect(_.keys(x1.types.secondent)).toEqual(['post'])
      expect(_.keys(x1.types.secondent.post.fields)).toEqual(['test'])
      expect(_.keys(x1.types.entity.sub)).toEqual(['post'])
      expect(_.keys(x1.types.entity.sub.post.fields)).toEqual(['test'])
    })
  })

  describe('getFields', () => {
    it('should return correct fields', () => {
      const x1 = new Validator({ validatorsPath: fixturesDir('validator') })

      x1.load()

      const fields = x1.getFields('testent.post')

      expect(_.keys(fields)).toEqual(['test', 'test2', 'subobj'])
    })

    it('should throw when type not registered', () => {
      const x1 = new Validator({ validatorsPath: fixturesDir('validator') })

      x1.load()

      expect(function () { x1.getFields('testent.update') }).toThrow(Error('The ValidatorObject testent.update is not registered'))
    })
  })

  describe('getFieldsArray', () => {
    it('should return correct fields', () => {
      const x1 = new Validator({ validatorsPath: fixturesDir('validator') })

      x1.load()

      const fields = x1.getFieldsArray('testent.post')

      expect(fields).toEqual(['test', 'test2', 'subobj'])
    })

    it('should throw when type not registered', () => {
      const x1 = new Validator({ validatorsPath: fixturesDir('validator') })

      x1.load()

      expect(function () { x1.getFieldsArray('testent.update') }).toThrow(Error('The ValidatorObject testent.update is not registered'))
    })
  })

  describe('validate', () => {
    it('should validate from fixture correctly', () => {
      const x1 = new Validator({ validatorsPath: fixturesDir('validator') })
      x1.load()

      const data = {
        test: true
      }

      expect(x1.validate(data, 'testent.post')).toEqual([
        { code: 'FIELD_NOT_STRING', msg: 'The field `test` should be a string', ref: 'test' },
        { code: 'FIELD_REQUIRED', msg: 'The field `subobj` is required', ref: 'subobj' }
      ])
    })

    it('should throw when type not registered', () => {
      const x1 = new Validator()

      const data = {
        test: true
      }

      expect(function () { x1.validate(data, 'testent.post') }).toThrow(Error('The ValidatorObject testent.post is not registered'))
    })
  })
})
