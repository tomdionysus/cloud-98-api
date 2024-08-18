const Field = require('../lib/Field')

describe('Field', () => {
  it('should allow New', () => {
    const x1 = new Field()
    const x2 = new Field()

    expect(x1).not.toBe(x2)
  })

  it('should have correct default properties', () => {
    const x1 = new Field()

    expect(x1.name).toBeUndefined()
    expect(x1.type).toBeUndefined()
    expect(x1._length).toBeUndefined()
    expect(x1._nullable).toEqual(true)
    expect(x1.table).toBeUndefined()
    expect(x1.options).toEqual({})
  })

  it('should have correct properties', () => {
    const x1 = new Field('NAME', 'TYPE', 'LENGTH', true, { option: 1 }, 'TABLE')

    expect(x1.name).toEqual('NAME')
    expect(x1.type).toEqual('TYPE')
    expect(x1._length).toEqual('LENGTH')
    expect(x1._nullable).toEqual(true)
    expect(x1.table).toEqual('TABLE')
    expect(x1.options).toEqual({ option: 1 })
  })

  describe('getSqlCreate', () => {
    it('should return correct SQL', () => {
      const x1 = new Field('NAME', 'varchar', 20, true, { option: 1 }, 'TABLE')

      expect(x1.getSqlCreate()).toEqual('`NAME` VARCHAR(20) NULL')
    })

    it('should return correct SQL with default', () => {
      const x1 = new Field('NAME', 'varchar', 20, true, { default: 'TEST' }, 'TABLE')

      expect(x1.getSqlCreate()).toEqual('`NAME` VARCHAR(20) NULL DEFAULT \'TEST\'')
    })

    it('should return correct SQL for PK', () => {
      const x1 = new Field('NAME', 'varchar', 20, false, { primaryKey: true }, 'TABLE')

      expect(x1.getSqlCreate()).toEqual('`NAME` VARCHAR(20) NOT NULL PRIMARY KEY')
    })

    it('should return options.definition SQL for custom type ', () => {
      const x1 = new Field('NAME', 'custom', 20, true, { definition: 'FUNCTION OF SQL' }, 'TABLE')

      expect(x1.getSqlCreate()).toEqual('FUNCTION OF SQL')
    })
  })

  describe('nullable', () => {
    it('should assign value to nullable', () => {
      const x1 = new Field()
      const x2 = new Field()
      const x3 = new Field()

      x1.nullable(false)
      x2.nullable()
      x3.nullable(true)

      expect(x1._nullable).toEqual(false)
      expect(x2._nullable).toEqual(true)
      expect(x3._nullable).toEqual(true)
    })
  })

  describe('unsigned', () => {
    it('should assign value to unsigned', () => {
      const x1 = new Field()
      const x2 = new Field()
      const x3 = new Field()

      x1.unsigned(false)
      x2.unsigned()
      x3.unsigned(true)

      expect(x1._unsigned).toEqual(false)
      expect(x2._unsigned).toEqual(true)
      expect(x3._unsigned).toEqual(true)
    })
  })

  describe('length', () => {
    it('should set length in options', () => {
      const x1 = new Field()

      x1.length('LENGTH')

      expect(x1._length).toEqual('LENGTH')
    })
  })

  describe('default', () => {
    it('should set default in options', () => {
      const x1 = new Field()

      x1.default('DEFAULT')

      expect(x1.options.default).toEqual('DEFAULT')
    })
  })

  describe('description', () => {
    it('should set _description', () => {
      const x1 = new Field()

      x1.description('Description')

      expect(x1._description).toEqual('Description')
    })
  })

  describe('primaryKey', () => {
    it('should set primaryKey in options', () => {
      const x1 = new Field()

      x1.primaryKey()

      expect(x1.options.primaryKey).toEqual(true)
    })
  })

  describe('getSqlType', () => {
    it('should return correct SQL type for uuid', () => {
      const x1 = new Field('test', 'uuid')
      expect(x1.getSqlType()).toEqual('CHAR(36)')
    })

    it('should return correct SQL type for char', () => {
      const x1 = new Field('test', 'char', 20)
      expect(x1.getSqlType()).toEqual('CHAR(20)')
    })

    it('should return correct SQL type for varchar', () => {
      const x1 = new Field('test', 'varchar', 21)
      expect(x1.getSqlType()).toEqual('VARCHAR(21)')
    })

    it('should return correct SQL type for enum', () => {
      const x1 = new Field('test', 'enum', 0, true, { values: ['one', 'two'] })
      expect(x1.getSqlType()).toEqual('ENUM(\'one\',\'two\')')
    })

    it('should return correct SQL type for tinyint', () => {
      const x1 = new Field('test', 'tinyint')
      expect(x1.getSqlType()).toEqual('TINYINT')
    })

    it('should return correct SQL type for smallint', () => {
      const x1 = new Field('test', 'smallint')
      expect(x1.getSqlType()).toEqual('SMALLINT')
    })

    it('should return correct SQL type for mediumint', () => {
      const x1 = new Field('test', 'mediumint')
      expect(x1.getSqlType()).toEqual('MEDIUMINT')
    })

    it('should return correct SQL type for integer', () => {
      const x1 = new Field('test', 'integer')
      expect(x1.getSqlType()).toEqual('INTEGER')
    })

    it('should return correct SQL type for bigint', () => {
      const x1 = new Field('test', 'bigint')
      expect(x1.getSqlType()).toEqual('BIGINT')
    })

    it('should return correct SQL type for unsigned tinyint', () => {
      const x1 = new Field('test', 'tinyint')
      x1.unsigned()
      expect(x1.getSqlType()).toEqual('TINYINT UNSIGNED')
    })

    it('should return correct SQL type for unsigned smallint', () => {
      const x1 = new Field('test', 'smallint')
      x1.unsigned()
      expect(x1.getSqlType()).toEqual('SMALLINT UNSIGNED')
    })

    it('should return correct SQL type for unsigned mediumint', () => {
      const x1 = new Field('test', 'mediumint')
      x1.unsigned()
      expect(x1.getSqlType()).toEqual('MEDIUMINT UNSIGNED')
    })

    it('should return correct SQL type for unsigned integer', () => {
      const x1 = new Field('test', 'integer')
      x1.unsigned()
      expect(x1.getSqlType()).toEqual('INTEGER UNSIGNED')
    })

    it('should return correct SQL type for unsigned bigint', () => {
      const x1 = new Field('test', 'bigint')
      x1.unsigned()
      expect(x1.getSqlType()).toEqual('BIGINT UNSIGNED')
    })

    it('should return correct SQL type for decimal', () => {
      const x1 = new Field('test', 'decimal', 0, true, { precision: 12, scale: 3 })
      expect(x1.getSqlType()).toEqual('DECIMAL(12,3)')
    })

    it('should return correct SQL type for text', () => {
      const x1 = new Field('test', 'text')
      expect(x1.getSqlType()).toEqual('TEXT')
    })

    it('should return correct SQL type for float', () => {
      const x1 = new Field('test', 'float')
      expect(x1.getSqlType()).toEqual('FLOAT')
    })

    it('should return correct SQL type for double', () => {
      const x1 = new Field('test', 'double')
      expect(x1.getSqlType()).toEqual('DOUBLE')
    })

    it('should return correct SQL type for datetime', () => {
      const x1 = new Field('test', 'datetime')
      expect(x1.getSqlType()).toEqual('DATETIME')
    })

    it('should return custom definiton for custom', () => {
      const x1 = new Field('NAME', 'custom', 20, true, { definition: 'FUNCTION OF SQL' }, 'TABLE')
      expect(x1.getSqlType()).toEqual('FUNCTION OF SQL')
    })

    it('should throw on bad type', () => {
      const x1 = new Field('test', 'badtype')
      expect(() => { x1.getSqlType() }).toThrow(Error('getSqlType: Unknown Field Type `badtype`'))
    })
  })

  describe('getSqlValue', () => {
    it('should format correctly for uuid', () => {
      const x1 = new Field('test', 'uuid')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for char', () => {
      const x1 = new Field('test', 'char')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for varchar', () => {
      const x1 = new Field('test', 'varchar')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for enum', () => {
      const x1 = new Field('test', 'enum')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for integer', () => {
      const x1 = new Field('test', 'integer')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for decimal', () => {
      const x1 = new Field('test', 'decimal')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for float', () => {
      const x1 = new Field('test', 'float')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for double', () => {
      const x1 = new Field('test', 'double')
      expect(x1.getSqlValue('TESTDATA')).toEqual('TESTDATA')
    })

    it('should format correctly for datetime', () => {
      const x1 = new Field('test', 'datetime')
      expect(x1.getSqlValue('2018-01-01T23:00:12Z')).toEqual('2018-01-01 23:00:12')
    })

    it('should format correctly for datetime to UTC with TZ', () => {
      const x1 = new Field('test', 'datetime')
      expect(x1.getSqlValue('2018-01-01T23:00:12+0500')).toEqual('2018-01-01 18:00:12')
    })

    it('should throw on bad type', () => {
      const x1 = new Field('test', 'badtype')
      expect(() => { x1.getSqlValue('TESTDATA') }).toThrow(Error('getSqlValue: Unknown Field Type `badtype`'))
    })
  })
})
