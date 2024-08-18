const Relation = require('../lib/Relation')

describe('Relation', () => {
  it('should allow New', () => {
    const x1 = new Relation(null, 'type', { name: 'table1' }, { name: 'table2' })
    const x2 = new Relation(null, 'type', { name: 'table1' }, { name: 'table3' })

    expect(x1).not.toBe(x2)
  })

  it('should have correct hasOne properties on new', () => {
    const x1 = new Relation(null, 'hasOne', { name: 'table1' }, { name: 'table2' })

    expect(x1.name).toEqual('table1_hasOne_table2')
    expect(x1.entityFromField).toEqual('table2_id')
    expect(x1.entityToField).toEqual('id')
  })

  it('should have correct hasOne properties on new', () => {
    const x1 = new Relation(null, 'hasMany', { name: 'table1' }, { name: 'table2' })

    expect(x1.name).toEqual('table1_hasMany_table2')
    expect(x1.entityFromField).toEqual('id')
    expect(x1.entityToField).toEqual('table1_id')
  })

  it('should have correct hasOnePoly properties on new', () => {
    const x1 = new Relation(null, 'hasOnePoly', { name: 'table1' }, { name: 'table2' })

    expect(x1.name).toEqual('table1_hasOnePoly_table2')
    expect(x1.entityFromField).toEqual('id')
    expect(x1.entityToField).toEqual('entity_id')
    expect(x1.entityTypeField).toEqual('entity_type')
  })

  it('should have correct hasManyThrough properties on new', () => {
    const x1 = new Relation(null, 'hasManyThrough', { name: 'table1' }, { name: 'table2' }, null, null, { name: 'linkTable' })

    expect(x1.name).toEqual('table1_hasManyThrough_table2')
    expect(x1.entityFromField).toEqual('id')
    expect(x1.entityToField).toEqual('id')
    expect(x1.entityLinkFromField).toEqual('table1_id')
    expect(x1.entityLinkToField).toEqual('table2_id')
  })

  it('should have correct hasManyThroughChain properties on new', () => {
    const x1 = new Relation('NAME', 'hasManyThroughChain', 'tableX', 'tableY', [{ entity1: 'table1', entity2: 'table2', field1: 'field1', field2: 'field2' }])

    expect(x1.chain).toEqual([{ entity1: 'table1', entity2: 'table2', field1: 'field1', field2: 'field2' }])
  })

  it('should have correct hasManyThroughChain default empty chain on new', () => {
    const x1 = new Relation('NAME', 'hasManyThroughChain', 'tableX', 'tableY')

    expect(x1.chain).toEqual([])
  })

  it('should have default hasManyPoly properties on new', () => {
    const x1 = new Relation(null, 'hasManyPoly', { name: 'table1' }, { name: 'table2' })

    expect(x1.name).toEqual('table1_hasManyPoly_table2')
    expect(x1.entityFromField).toEqual('id')
    expect(x1.entityToField).toEqual('entity_id')
    expect(x1.entityTypeField).toEqual('entity_type')
  })

  it('should have correct hasManyPoly properties on new', () => {
    const x1 = new Relation(null, 'hasManyPoly', { name: 'table1' }, { name: 'table2' }, 'fromID', 'toID', null, null, null, 'typeID')

    expect(x1.name).toEqual('table1_hasManyPoly_table2')
    expect(x1.entityFromField).toEqual('fromID')
    expect(x1.entityToField).toEqual('toID')
    expect(x1.entityTypeField).toEqual('typeID')
  })

  describe('getSqlComponents', () => {
    it('should have correct hasOne properties on new', () => {
      const x1 = new Relation(null, 'hasOne', { name: 'table1' }, { name: 'table2' })

      expect(x1.getSqlComponents()).toEqual({ tables: ['??', '??'], where: ['(??=??)'], params: ['table1', 'table2', 'table1.table2_id', 'table2.id'] })
    })

    it('should have correct hasOne properties on new', () => {
      const x1 = new Relation(null, 'hasMany', { name: 'table1' }, { name: 'table2' })

      expect(x1.getSqlComponents()).toEqual({ tables: ['??', '??'], where: ['(??=??)'], params: ['table1', 'table2', 'table1.id', 'table2.table1_id'] })
    })

    it('should have correct hasOnePoly properties on new', () => {
      const x1 = new Relation(null, 'hasOnePoly', { name: 'table1' }, { name: 'table2' })

      expect(x1.getSqlComponents()).toEqual({ tables: ['??', '??'], where: ['((??=??) AND (??=?))'], params: ['table1', 'table2', 'table2.entity_id', 'table1.id', 'table2.entity_type', 'table1'] })
    })

    it('should have correct hasManyThrough properties on new', () => {
      const x1 = new Relation(null, 'hasManyThrough', { name: 'table1' }, { name: 'table2' }, null, null, { name: 'linkTable' })

      expect(x1.getSqlComponents()).toEqual({ tables: ['??', '??', '??'], where: ['((??=??) AND (??=??))'], params: ['table1', 'table2', 'linkTable', 'table2.id', 'linkTable.table2_id', 'linkTable.table1_id', 'table1.id'] })
    })

    it('should have correct hasManyThroughChain properties on new', () => {
      const x1 = new Relation('NAME', 'hasManyThroughChain', 'tableX', 'tableY', [{ entity1: 'table1', entity2: 'table2', field1: 'field1', field2: 'field2' }])

      expect(x1.getSqlComponents()).toEqual({ tables: ['??', '??', '??'], where: ['((??=??))'], params: ['undefined', 'table1', 'table2', 'table1.field1', 'table2.field2'] })
    })

    it('should have correct hasManyPoly properties on new', () => {
      const x1 = new Relation('NAME', 'hasManyPoly', { name: 'table1' }, { name: 'table2' }, 'fromID', 'toID', null, null, null, 'typeID')

      expect(x1.getSqlComponents()).toEqual({ tables: ['??', '??'], where: ['((??=??) AND (??=?))'], params: ['table1', 'table2', 'table2.toID', 'table1.fromID', 'table2.typeID', 'table1'] })
    })
  })
})
