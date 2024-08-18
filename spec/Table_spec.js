const Table = require('../lib/Table')

describe('Table', () => {
  it('should allow New', () => {
    const x1 = new Table()
    const x2 = new Table()

    expect(x1).not.toBe(x2)
  })

  it('should have correct properties on new', () => {
    const x1 = new Table('NAME', 'SCHEMA')

    expect(x1.name).toEqual('NAME')
    expect(x1.schema).toEqual('SCHEMA')
    expect(x1.fields).toEqual({})
    expect(x1.fieldsOrder).toEqual([])
    expect(x1.relations).toEqual({})
    expect(x1.relationsData).toEqual([])
    expect(x1.scopes).toEqual({})
  })

  describe('init', () => {
    it('should throw on bad relation from (table not schema registered)', () => {
      const x1 = new Table('NAME', { tables: {} })

      x1.addRelation('name', 'type', 'entity2Name', 'entity1FieldName', 'entity2FieldName', 'entityLinkName', 'entity1LinkFieldName', 'entity2LinkFieldName')

      expect(() => { x1.init() }).toThrow(Error('Relations: Table NAME - type Cannot find entity NAME'))
    })

    it('should throw on bad relation to', () => {
      const x1 = new Table('NAME', { tables: { NAME: {} } })

      x1.addRelation('name', 'type', 'entity2Name', 'entity1FieldName', 'entity2FieldName', 'entityLinkName', 'entity1LinkFieldName', 'entity2LinkFieldName')

      expect(() => { x1.init() }).toThrow(Error('Relations: Table NAME - type Cannot find entity entity2Name'))
    })

    it('should throw on bad relation to', () => {
      const x1 = new Table('NAME', { tables: { NAME: {}, entity2Name: {} } })

      x1.addRelation('name', 'hasManyThrough', 'entity2Name', 'entity1FieldName', 'entity2FieldName', 'entityLinkName', 'entity1LinkFieldName', 'entity2LinkFieldName')

      expect(() => { x1.init() }).toThrow(Error('Relations: Table NAME - hasManyThrough Cannot find entity entityLinkName'))
    })
  })

  describe('description', () => {
    it('should set description', () => {
      const x1 = new Table('NAME', { tables: {} })

      x1.description('DESCRIPTION')

      expect(x1._description).toEqual('DESCRIPTION')
    })
  })

  describe('Field addition methods', () => {
    it('should add FieldUUID', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldUUID('test', true)

      expect(f.type).toEqual('uuid')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldVarchar', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldVarchar('test', true)

      expect(f.type).toEqual('varchar')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldChar', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldChar('test', true)

      expect(f.type).toEqual('char')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldTinyInt', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldTinyInt('test', true)

      expect(f.type).toEqual('tinyint')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldSmallInt', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldSmallInt('test', true)

      expect(f.type).toEqual('smallint')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldMediumInt', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldMediumInt('test', true)

      expect(f.type).toEqual('mediumint')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldInteger', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldInteger('test', true)

      expect(f.type).toEqual('integer')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldBigInt', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldBigInt('test', true)

      expect(f.type).toEqual('bigint')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldDecimal', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldDecimal('test', true)

      expect(f.type).toEqual('decimal')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldEnum', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldEnum('test', true)

      expect(f.type).toEqual('enum')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldText', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldText('test', true)

      expect(f.type).toEqual('text')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldDatetime', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldDatetime('test', true)

      expect(f.type).toEqual('datetime')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldCustom', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldCustom('test', true)

      expect(f.type).toEqual('custom')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldUUIDPrimaryKey', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldUUIDPrimaryKey('test')

      expect(f.type).toEqual('uuid')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })

    it('should add FieldBigIntPrimaryKey', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      const f = x1.FieldBigIntPrimaryKey('test')

      expect(f.type).toEqual('bigint')
      expect(x1.fields).toEqual({ test: f })
      expect(x1.fieldsOrder).toEqual([f])
    })
  })

  describe('addRelation', () => {
    it('should add correct object', () => {
      const x1 = new Table('NAME', 'SCHEMA')

      x1.addRelation('name', 'type', 'entity2Name', 'entity1FieldName', 'entity2FieldName', 'entityLinkName', 'entity1LinkFieldName', 'entity2LinkFieldName')

      expect(x1.relationsData).toEqual([{ name: 'name', type: 'type', entityFrom: x1.name, entityTo: 'entity2Name', entityFromField: 'entity1FieldName', entityToField: 'entity2FieldName', entityLink: 'entityLinkName', entityLinkFromField: 'entity1LinkFieldName', entityLinkToField: 'entity2LinkFieldName' }])
    })
  })

  describe('getSqlCreate', () => {
    it('should return correct SQL', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', 20, true)

      x1.indexOn('one')
      x1.uniqueIndexOn('two')

      x1.engine = 'INNODB'
      x1.charset = 'CHARSET'
      x1.collate = 'COLLATE'

      expect(x1.getSqlCreate()).toEqual(`CREATE TABLE \`NAME\` (
	\`one\` DATETIME NULL,
	\`two\` VARCHAR(20) NULL
) ENGINE=INNODB DEFAULT CHARSET=CHARSET COLLATE=COLLATE;
CREATE INDEX \`idx_NAME_one\` ON \`NAME\` (one);
CREATE UNIQUE INDEX \`udx_NAME_two\` ON \`NAME\` (two);`)
    })

    it('should use schema defaults for engine, charset, collate', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', 20, true)

      x1.indexOn('one')
      x1.uniqueIndexOn('two')

      x1.schema = {
        default: 'INNODB',
        defaultCharset: 'CHARSET',
        defaultCollate: 'COLLATE'
      }

      expect(x1.getSqlCreate()).toEqual(`CREATE TABLE \`NAME\` (
	\`one\` DATETIME NULL,
	\`two\` VARCHAR(20) NULL
) ENGINE=INNODB DEFAULT CHARSET=CHARSET COLLATE=COLLATE;
CREATE INDEX \`idx_NAME_one\` ON \`NAME\` (one);
CREATE UNIQUE INDEX \`udx_NAME_two\` ON \`NAME\` (two);`)
    })
  })

  describe('getInsertData', () => {
    it('should add correct object', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', 20, true)

      const data = {
        one: new Date('2018-02-03T04:05:06+03:00'),
        two: 'Testdata'
      }

      expect(x1.getInsertData(data)).toEqual({ fields: ['one', 'two'], values: ['2018-02-03 01:05:06', 'Testdata'], params: '?,?' })
    })
  })

  describe('getUpdateData', () => {
    it('should add correct object', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', true, 20)

      const data = {
        one: new Date('2018-02-03T04:05:06+03:00'),
        two: 'Testdata'
      }

      expect(x1.getUpdateData(data)).toEqual({ assigns: ['?? = ?', '?? = ?'], values: ['NAME.one', '2018-02-03 01:05:06', 'NAME.two', 'Testdata'] })
    })
  })

  describe('indexOn', () => {
    it('should add index definition', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', true, 20)

      x1.indexOn('one')

      expect(x1.indexes).toEqual({ idx_NAME_one: ['one'] })
    })

    it('should add index definition for multipe fields', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', true, 20)

      x1.indexOn('one', 'two')

      expect(x1.indexes).toEqual({ idx_NAME_one_two: ['one', 'two'] })
    })

    it('should throw when field not defined', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', true, 20)

      expect(() => { x1.indexOn('five') }).toThrow(Error('Index: Table NAME, idx_NAME_five - Cannot find field five'))
    })
  })

  describe('uniqueIndexOn', () => {
    it('should add index definition', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', true, 20)

      x1.uniqueIndexOn('one')

      expect(x1.uniqueIndexes).toEqual({ udx_NAME_one: ['one'] })
    })

    it('should add index definition for multipe fields', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', true, 20)

      x1.uniqueIndexOn('one', 'two')

      expect(x1.uniqueIndexes).toEqual({ udx_NAME_one_two: ['one', 'two'] })
    })

    it('should throw when field not defined', () => {
      const x1 = new Table('NAME', 'SCHEMA')
      x1.FieldDatetime('one', true)
      x1.FieldVarchar('two', true, 20)

      expect(() => { x1.uniqueIndexOn('five') }).toThrow(Error('Unique Index: Table NAME, udx_NAME_five - Cannot find field five'))
    })
  })

  describe('hasManyThroughChain', () => {
    it('should register hasManyThroughChain relation', () => {
      const x1 = new Table('NAME', { tables: {} })

      x1.hasManyThroughChain('entity2Name', [{ entity1: 'table1', entity2: 'table2', field1: 'field1', field2: 'field2' }])

      expect(x1.relationsData[0]).toEqual({ name: null, type: 'hasManyThroughChain', entityFrom: 'NAME', entityTo: 'entity2Name', entityFromField: [Object({ entity1: 'table1', entity2: 'table2', field1: 'field1', field2: 'field2' })], entityToField: undefined, entityLink: undefined, entityLinkFromField: undefined, entityLinkToField: undefined })
    })
  })

  describe('hasOnePoly', () => {
    it('should register hasOnePoly relation', () => {
      const x1 = new Table('NAME', { tables: {} })

      x1.hasOnePoly('entity2Name', 'entityFromField', 'entityToField', 'entityTypeField')

      expect(x1.relationsData[0]).toEqual({ name: null, type: 'hasManyOne', entityFrom: 'NAME', entityTo: 'entity2Name', entityFromField: 'entityFromField', entityToField: 'entityToField', entityLink: null, entityLinkFromField: null, entityLinkToField: null })
    })
  })

  describe('hasManyPoly', () => {
    it('should register hasManyPoly relation', () => {
      const x1 = new Table('NAME', { tables: {} })

      x1.hasManyPoly('entityToName', 'entityFromField', 'entityToField', 'entityTypeField')

      expect(x1.relationsData[0]).toEqual({ name: null, type: 'hasManyPoly', entityFrom: 'NAME', entityTo: 'entityToName', entityFromField: 'entityFromField', entityToField: 'entityToField', entityLink: null, entityLinkFromField: null, entityLinkToField: null })
    })
  })
})
