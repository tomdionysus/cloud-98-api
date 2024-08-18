const Schema = require('../lib/Schema')
const Table = require('../lib/Table')
const path = require('path')

describe('Schema', () => {
  describe('Init', () => {
    it('should allow New', () => {
      const x1 = new Schema()
      const x2 = new Schema()

      expect(x1).not.toBe(x2)
    })
  })

  describe('load', () => {
    it('should load fixtures correctly', () => {
      const x1 = new Schema({ path: path.join(__dirname, './fixtures/schema') })

      x1.load()

      expect(x1.tables.test1).toEqual(jasmine.any(Table))
      expect(x1.tables.test1.name).toEqual('test1')
    })
  })

  describe('parseUrlQuery', () => {
    describe('fields and operations', () => {
      it('should parse simple field eq', () => {
        const quo = { test: 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? = ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse explicit field eq', () => {
        const quo = { 'test._eq': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? = ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse explicit field neq', () => {
        const quo = { 'test._neq': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? <> ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse explicit field gt', () => {
        const quo = { 'test._gt': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? > ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse explicit field gte', () => {
        const quo = { 'test._gte': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? >= ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse explicit field lt', () => {
        const quo = { 'test._lt': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? < ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse explicit field lte', () => {
        const quo = { 'test._lte': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? <= ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse like', () => {
        const quo = { 'test._like': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(?? LIKE ?)'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse notlike', () => {
        const quo = { 'test._nlike': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: ['(NOT (?? LIKE ?))'], params: ['table.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should error on bad operation', () => {
        const quo = { 'test._bad': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'NO_SUCH_OPERATION', message: 'The operation does not exist', ref: 'test._bad' }], embed: {}, extra: {}, order: [] })
      })

      it('should error on no operation', () => {
        const quo = { '': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'INVALID_FILTER', message: 'The filter is invalid', ref: '' }], embed: {}, extra: {}, order: [] })
      })

      it('should error on field query when options state not allowed', () => {
        const quo = { test: 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'], { allowFieldQuery: false })).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'FIELD_QUERY_NOT_ALLOWED', message: 'You cannot use a field query on this request.', ref: 'table.test' }], embed: {}, extra: {}, order: [] })
      })
    })

    describe('fields with specific tables', () => {
      it('should parse table field eq', () => {
        const quo = { 'users.test': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        const t2 = new Table('users')
        t1.FieldVarchar('test', true, 64)
        t2.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        x1.addTable(t2)
        expect(x1.parseUrlQuery(quo, ['table', 'users'])).toEqual({ where: ['(?? = ?)'], params: ['users.test', 'value1'], limit: [], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should error on unknown table', () => {
        const quo = { 'secondary.test': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        const t2 = new Table('users')
        t1.FieldVarchar('test', true, 64)
        t2.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        x1.addTable(t2)
        expect(x1.parseUrlQuery(quo, ['table', 'users'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'UNKNOWN_ENTITY', message: 'The filter contains an unknown entity', ref: 'secondary' }], embed: {}, extra: {}, order: [] })
      })

      it('should error if field does not exist', () => {
        const quo = { 'table.test3': 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'UNKNOWN_FIELD', message: 'There is no such field on the entity', ref: 'table.test3' }], embed: { }, extra: {}, order: [] })
      })
    })

    describe('get', () => {
      it('should get correct table', () => {
        const x1 = new Schema()
        const t1 = new Table('table')
        const t2 = new Table('users')
        t1.FieldVarchar('test', true, 64)
        t2.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        x1.addTable(t2)
        expect(x1.get('table')).toBe(t1)
        expect(x1.get('users')).toBe(t2)
        expect(x1.get('bad')).toBeUndefined()
      })
    })

    describe('_limit bare operation', () => {
      it('should parse single limit', () => {
        const quo = { _limit: '10' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: ['10'], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should parse single limit and offset', () => {
        const quo = { _limit: '10,20' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: ['10', '20'], errors: [], embed: {}, extra: {}, order: [] })
      })

      it('should error on bad limit', () => {
        const quo = { _limit: '10,20,30' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'CANNOT_PARSE_LIMIT', message: 'The limit clause cannot be parsed', ref: '10,20,30' }], embed: {}, extra: {}, order: [] })
      })

      it('should error on multiple limits', () => {
        const quo = { _limit: ['10,20,30'] }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'CANNOT_PARSE_LIMIT', message: 'The limit clause cannot be parsed', ref: ['10,20,30'] }], embed: {}, extra: {}, order: [] })
      })

      it('should error on unknown bare operation', () => {
        const quo = { _bad: '10,20,30' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'NO_SUCH_OPERATION', message: 'The operation does not exist', ref: '_bad' }], embed: {}, extra: {}, order: [] })
      })

      it('should error when limit not allowed', () => {
        const quo = { _limit: '10' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'], { allowLimit: false })).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'LIMIT_NOT_ALLOWED', message: 'You cannot use a _limit operation on this request.' }], embed: {}, extra: {}, order: [] })
      })
    })

    describe('_sort bare operation', () => {
      it('should parse single sort', () => {
        const quo = { _sort: 'test' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: ['`table`.`test`'], errors: [], embed: {}, extra: {} })
      })

      it('should parse single sort with ._asc', () => {
        const quo = { _sort: 'test._asc' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: ['`table`.`test` ASC'], errors: [], embed: {}, extra: {} })
      })

      it('should error on bad field postoperator', () => {
        const quo = { _sort: 'test._bad' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: [], errors: [{ code: 'CANNOT_PARSE_SORT', message: 'The sort clause cannot be parsed', ref: 'test._bad' }], embed: {}, extra: {} })
      })

      it('should parse single sort with ._desc', () => {
        const quo = { _sort: 'test._desc' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: ['`table`.`test` DESC'], errors: [], embed: {}, extra: {} })
      })

      it('should error if sort field not present', () => {
        const quo = { _sort: 'test2' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: [], errors: [{ code: 'UNKNOWN_FIELD', message: 'The field to be sorted by does not exist', ref: 'test2' }], embed: {}, extra: {} })
      })

      it('should parse multiple sort', () => {
        const quo = { _sort: 'test,test2' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        t1.FieldVarchar('test2', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: ['`table`.`test`', '`table`.`test2`'], errors: [], embed: {}, extra: {} })
      })

      it('should parse multiple sort with postoperators', () => {
        const quo = { _sort: 'test._asc,test2._desc' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        t1.FieldVarchar('test2', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: ['`table`.`test` ASC', '`table`.`test2` DESC'], errors: [], embed: {}, extra: {} })
      })

      it('should error on bad sort', () => {
        const quo = { _sort: '' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: [], errors: [{ code: 'CANNOT_PARSE_SORT', message: 'The sort clause cannot be parsed', ref: '' }], embed: {}, extra: {} })
      })

      it('should error on sort non-string', () => {
        const quo = { _sort: 1281827323 }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], order: [], errors: [{ code: 'CANNOT_PARSE_SORT', message: 'The sort clause cannot be parsed', ref: 1281827323 }], embed: {}, extra: {} })
      })

      it('should error when sort not allowed', () => {
        const quo = { _sort: '10' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'], { allowSort: false })).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'SORT_NOT_ALLOWED', message: 'You cannot use a _sort operation on this request.' }], embed: {}, extra: {}, order: [] })
      })
    })

    describe('_embed bare operation', () => {
      it('should parse single embed', () => {
        const x1 = new Schema()
        const t1 = new Table('table')
        const t2 = new Table('table2')
        t1.FieldVarchar('test', true, 64)
        t2.FieldVarchar('test', true, 64)
        t2.FieldUUID('table_id', true, 64)
        x1.addTable(t1)
        x1.addTable(t2)
        t1.hasMany('table2')
        x1.init()

        const quo = { _embed: 'table2' }

        expect(x1.parseUrlQuery(quo, ['table', 'table2'])).toEqual({ where: [], params: [], limit: [], errors: [], order: [], extra: {}, embed: { table2: { tables: ['??', '??'], where: ['(??=??)'], params: ['table', 'table2', 'table.id', 'table2.table_id'] } } })
      })

      it('should parse custom _embed', () => {
        const x1 = new Schema()
        const t1 = new Table('table')
        const t2 = new Table('table2')
        t1.FieldVarchar('test', true, 64)
        t2.FieldVarchar('test', true, 64)
        t2.FieldUUID('table_id', true, 64)
        x1.addTable(t1)
        x1.addTable(t2)
        t1.hasMany('table2')
        x1.init()

        const quo = { _embed: 'table2,_definitions' }

        expect(x1.parseUrlQuery(quo, ['table', 'table2'])).toEqual({ where: [], params: [], limit: [], errors: [], order: [], extra: {}, embed: { table2: { tables: ['??', '??'], where: ['(??=??)'], params: ['table', 'table2', 'table.id', 'table2.table_id'] } }, definitions: true })
      })

      it('should error when embed incorrect type', () => {
        const quo = { _embed: 103 }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'CANNOT_PARSE_EMBED', message: 'The embed clause cannot be parsed', ref: 103 }], embed: {}, extra: {}, order: [] })
      })

      it('should error when embed not invalid', () => {
        const quo = { _embed: '' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'CANNOT_PARSE_EMBED', message: 'The embed clause cannot be parsed', ref: '' }], embed: {}, extra: {}, order: [] })
      })

      it('should error when embed not allowed', () => {
        const quo = { _embed: 'table3' }

        const x1 = new Schema()
        const t1 = new Table('table')
        const t2 = new Table('table2')
        t1.FieldVarchar('test', true, 64)
        t2.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        x1.addTable(t2)
        expect(x1.parseUrlQuery(quo, ['table'])).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'RESOURCE_CANNOT_BE_EMBEDDED', message: 'The specified resource cannot be embedded', ref: 'table.table3' }], embed: {}, extra: {}, order: [] })
      })

      it('should error when embed not allowed in options', () => {
        const x1 = new Schema()
        const t1 = new Table('table')
        const t2 = new Table('table2')
        t1.FieldVarchar('test', true, 64)
        t2.FieldVarchar('test', true, 64)
        t2.FieldUUID('table_id', true, 64)
        x1.addTable(t1)
        x1.addTable(t2)
        t1.hasMany('table2')
        x1.init()

        const quo = { _embed: 'table2' }

        expect(x1.parseUrlQuery(quo, ['table'], { allowEmbed: false })).toEqual({ where: [], params: [], limit: [], errors: [{ code: 'EMBED_NOT_ALLOWED', message: 'You cannot use a _embed operation on this request.' }], embed: {}, extra: {}, order: [] })
      })
    })

    describe('exception conditions', () => {
      it('should throw when no tables supplied', () => {
        const quo = { test: 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(() => { x1.parseUrlQuery(quo) }).toThrow(Error('parseUrlQuery: Tables not supplied'))
      })

      it('should throw when a table is not recognised', () => {
        const quo = { test: 'value1' }

        const x1 = new Schema()
        const t1 = new Table('table')
        t1.FieldVarchar('test', true, 64)
        x1.addTable(t1)
        expect(() => { x1.parseUrlQuery(quo, ['nontable']) }).toThrow(Error('parseUrlQuery: Unknown table `nontable`'))
      })
    })
  })

  describe('getSqlCreate', () => {
    it('should return correct SQL', () => {
      const x1 = new Schema({ path: path.join(__dirname, './fixtures/schema') })

      x1.load()

      expect(x1.getSqlCreate()).toEqual(`CREATE TABLE \`test1\` (
	\`id\` CHAR(36) NOT NULL PRIMARY KEY,
	\`name\` VARCHAR(128) NOT NULL
);`)
    })
  })

  describe('getScopes', () => {
    it('should correct scopes', () => {
      const x1 = new Schema({ path: path.join(__dirname, './fixtures/schema') })

      x1.load()

      expect(x1.getScopes(x1.get('test1'), { test2_id: 'test', not_specified: 'one' })).toEqual({ where: ['(?? = ?)'], params: ['test1.test2_id', 'test'] })
    })
  })
})
