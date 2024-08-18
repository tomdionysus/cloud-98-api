class Relation {
  constructor (
    name,
    type,
    entityFrom,
    entityTo,
    entityFromField,
    entityToField,
    entityLink,
    entityLinkFromField,
    entityLinkToField,
    entityTypeField
  ) {
    this.name = name || entityFrom.name + '_' + type + '_' + entityTo.name
    this.type = type
    this.entityFrom = entityFrom
    this.entityTo = entityTo
    this.entityFromField = entityFromField
    this.entityToField = entityToField
    this.entityLink = entityLink
    this.entityLinkFromField = entityLinkFromField
    this.entityLinkToField = entityLinkToField
    this.entityTypeField = entityTypeField

    switch (this.type) {
      case 'hasOne':
        this.entityFromField = entityFromField || this.entityTo.name + '_id'
        this.entityToField = entityToField || 'id'
        break
      case 'hasOnePoly':
        this.entityFromField = entityFromField || 'id'
        this.entityToField = entityToField || 'entity_id'
        this.entityTypeField = entityTypeField || 'entity_type'
        break
      case 'hasMany':
        this.entityFromField = entityFromField || 'id'
        this.entityToField = entityToField || this.entityFrom.name + '_id'
        break
      case 'hasManyThrough':
        this.entityFromField = entityFromField || 'id'
        this.entityToField = entityToField || 'id'
        this.entityLinkFromField = entityLinkFromField || this.entityFrom.name + '_id'
        this.entityLinkToField = entityLinkToField || this.entityTo.name + '_id'
        break
      case 'hasManyThroughChain':
        this.chain = entityFromField || []
        break
      case 'hasManyPoly':
        this.entityFromField = entityFromField || 'id'
        this.entityToField = entityToField || 'entity_id'
        this.entityTypeField = entityTypeField || 'entity_type'
        break
    }
  }

  getSqlComponents () {
    const out = { tables: [], where: [], params: [] }; const tables = {}; const whereparams = []; const whereclause = []

    switch (this.type) {
      case 'hasOne':
        out.tables.push('??')
        out.tables.push('??')
        out.params.push(this.entityFrom.name)
        out.params.push(this.entityTo.name)

        out.where.push('(??=??)')
        out.params.push(this.entityFrom.name + '.' + this.entityFromField)
        out.params.push(this.entityTo.name + '.' + this.entityToField)
        break
      case 'hasOnePoly':
        out.tables.push('??')
        out.tables.push('??')

        out.params.push(this.entityFrom.name)
        out.params.push(this.entityTo.name)

        out.where.push('((??=??) AND (??=?))')
        out.params.push(this.entityTo.name + '.' + this.entityToField)
        out.params.push(this.entityFrom.name + '.' + this.entityFromField)
        out.params.push(this.entityTo.name + '.' + this.entityTypeField)
        out.params.push(this.entityFrom.name)
        break
      case 'hasMany':
        out.tables.push('??')
        out.tables.push('??')
        out.params.push(this.entityFrom.name)
        out.params.push(this.entityTo.name)

        out.where.push('(??=??)')
        out.params.push(this.entityFrom.name + '.' + this.entityFromField)
        out.params.push(this.entityTo.name + '.' + this.entityToField)
        break
      case 'hasManyThrough':
        out.tables.push('??')
        out.tables.push('??')
        out.tables.push('??')

        out.params.push(this.entityFrom.name)
        out.params.push(this.entityTo.name)
        out.params.push(this.entityLink.name)

        out.where.push('((??=??) AND (??=??))')
        out.params.push(this.entityTo.name + '.' + this.entityToField)
        out.params.push(this.entityLink.name + '.' + this.entityLinkToField)
        out.params.push(this.entityLink.name + '.' + this.entityLinkFromField)
        out.params.push(this.entityFrom.name + '.' + this.entityFromField)
        break
      case 'hasManyThroughChain':

        tables[this.entityFrom.name] = true
        tables[this.entityTo.name] = true
        for (const i in this.chain) {
          const comp = this.chain[i]
          whereparams.push(comp.entity1 + '.' + comp.field1)
          whereparams.push(comp.entity2 + '.' + comp.field2)
          tables[comp.entity1] = true
          tables[comp.entity2] = true
          whereclause.push('(??=??)')
        }
        for (const k in tables) {
          out.tables.push('??')
          out.params.push(k)
        }
        out.params = out.params.concat(whereparams)
        out.where.push('(' + whereclause.join(' AND ') + ')')
        break
      case 'hasManyPoly':
        out.tables.push('??')
        out.tables.push('??')

        out.params.push(this.entityFrom.name)
        out.params.push(this.entityTo.name)

        out.where.push('((??=??) AND (??=?))')
        out.params.push(this.entityTo.name + '.' + this.entityToField)
        out.params.push(this.entityFrom.name + '.' + this.entityFromField)
        out.params.push(this.entityTo.name + '.' + this.entityTypeField)
        out.params.push(this.entityFrom.name)
        break
    }

    return out
  }
}

module.exports = Relation
