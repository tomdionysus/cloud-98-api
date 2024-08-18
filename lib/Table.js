const Field = require('./Field')
const Relation = require('./Relation')

class Table {
  constructor (name, schema, options) {
    options = options || {}

    this.name = name
    this.schema = schema
    this.fields = {}
    this.fieldsOrder = []
    this.relations = {}
    this.scopes = {}
    this.indexes = {}
    this.uniqueIndexes = {}
    this.engine = options.engine || null
    this.charset = options.charset || null
    this.collate = options.collate || null
    this.handlers = {}
    this.customEmbed = {}

    // RelationsData only exists to store parameters of relations.
    this.relationsData = []
  }

  init () {
    for (const i in this.relationsData) {
      const rd = this.relationsData[i]
      const entityFrom = this.schema.tables[rd.entityFrom]
      const entityTo = this.schema.tables[rd.entityTo]
      const entityLink = this.schema.tables[rd.entityLink]
      if (!entityFrom) throw new Error('Relations: Table ' + this.name + ' - ' + rd.type + ' Cannot find entity ' + rd.entityFrom)
      if (!entityTo) throw new Error('Relations: Table ' + this.name + ' - ' + rd.type + ' Cannot find entity ' + rd.entityTo)
      if (rd.type === 'hasManyThrough' && !entityLink) throw new Error('Relations: Table ' + this.name + ' - ' + rd.type + ' Cannot find entity ' + rd.entityLink)
      this.relations[entityTo.name] = new Relation(null, rd.type, entityFrom, entityTo, rd.entityFromField, rd.entityToField, entityLink, rd.entityLinkFromField, rd.entityLinkToField)
    }
    delete this.relationsData
  }

  description (text) {
    this._description = text
  }

  addField (name, type, length, nullable, options) {
    const f = new Field(name, type, length, nullable, options, this)
    this.fields[name] = f
    this.fieldsOrder.push(f)
    return f
  }

  getField (name) {
    return this.fields[name]
  }

  FieldUUID (name, nullable) { return this.addField(name, 'uuid', null, nullable) }
  FieldVarchar (name, length, nullable) { return this.addField(name, 'varchar', length, nullable) }
  FieldChar (name, length, nullable) { return this.addField(name, 'char', length, nullable) }
  FieldTinyInt (name, nullable) { return this.addField(name, 'tinyint', null, nullable) }
  FieldSmallInt (name, nullable) { return this.addField(name, 'smallint', null, nullable) }
  FieldMediumInt (name, nullable) { return this.addField(name, 'mediumint', null, nullable) }
  FieldInteger (name, nullable) { return this.addField(name, 'integer', null, nullable) }
  FieldBigInt (name, nullable) { return this.addField(name, 'bigint', null, nullable) }
  FieldDecimal (name, precision, scale, nullable) { return this.addField(name, 'decimal', null, nullable, { precision: precision || 10, scale: scale || 7 }) }
  FieldEnum (name, values, nullable) { return this.addField(name, 'enum', null, nullable, { values: values }) }
  FieldText (name, length, nullable) { return this.addField(name, 'text', nullable) }
  FieldDatetime (name, values, nullable) { return this.addField(name, 'datetime', null, nullable, { values: values }) }
  FieldJSON (name, nullable) { return this.addField(name, 'json', null, nullable) }
  FieldCustom (name, definition) { return this.addField(name, 'custom', null, null, { definition: definition }) }

  FieldUUIDPrimaryKey (name) { return this.FieldUUID(name, false).primaryKey() }
  FieldBigIntPrimaryKey (name) { return this.FieldBigInt(name, false).unsigned().primaryKey() }

  addRelation (
    name,
    type,
    entityTo,
    entityFromField,
    entityToField,
    entityLink,
    entityLinkFromField,
    entityLinkToField
  ) {
    this.relationsData.push({
      name: name,
      type: type,
      entityFrom: this.name,
      entityTo: entityTo,
      entityFromField: entityFromField,
      entityToField: entityToField,
      entityLink: entityLink,
      entityLinkFromField: entityLinkFromField,
      entityLinkToField: entityLinkToField
    })
  }

  hasManyThroughChain (entityTo, chain) {
    this.addRelation(null, 'hasManyThroughChain', entityTo, chain)
  }

  hasManyThrough (
    entityTo,
    entityLink,
    entityFromField,
    entityToField,
    entityLinkFromField,
    entityLinkToField
  ) {
    this.addRelation(null, 'hasManyThrough', entityTo, entityFromField, entityToField, entityLink, entityLinkFromField, entityLinkToField)
  }

  hasMany (entityTo, entityFromField, entityToField) {
    this.addRelation(null, 'hasMany', entityTo, entityFromField, entityToField)
  }

  hasManyPoly (entityTo, entityFromField, entityToField, entityTypeField) {
    this.addRelation(null, 'hasManyPoly', entityTo, entityFromField, entityToField, null, null, null, entityTypeField)
  }

  hasOne (entityTo, entityFromField, entityToField) {
    this.addRelation(null, 'hasOne', entityTo, entityFromField, entityToField)
  }

  hasOnePoly (entityTo, entityFromField, entityToField, entityTypeField) {
    this.addRelation(null, 'hasManyOne', entityTo, entityFromField, entityToField, null, null, null, entityTypeField)
  }

  scopedBy (entityName, fieldName, options) {
    fieldName = fieldName || entityName + '_id'
    this.scopes[fieldName] = this.scopes[fieldName] || {}
    this.scopes[fieldName][entityName] = { entityName: entityName, fieldName: fieldName, options: options }
  }

  indexOn () {
    const args = Array.from(arguments)
    const name = 'idx_' + this.name + '_' + args.join('_')
    for (const i in args) {
      const fieldName = args[i]
      if (!this.fields[fieldName]) throw new Error('Index: Table ' + this.name + ', ' + name + ' - Cannot find field ' + fieldName)
    }
    this.indexes[name] = args
  }

  uniqueIndexOn () {
    const args = Array.from(arguments)
    const name = 'udx_' + this.name + '_' + args.join('_')
    for (const i in args) {
      const fieldName = args[i]
      if (!this.fields[fieldName]) throw new Error('Unique Index: Table ' + this.name + ', ' + name + ' - Cannot find field ' + fieldName)
    }
    this.uniqueIndexes[name] = args
  }

  getSqlCreate () {
    let i; let index; const fields = []
    for (i in this.fieldsOrder) {
      const field = this.fieldsOrder[i]
      fields.push(field.getSqlCreate())
    }
    const engine = this.engine || (this.schema ? this.schema.default : null)
    const charset = this.charset || (this.schema ? this.schema.defaultCharset : null)
    const collate = this.collate || (this.schema ? this.schema.defaultCollate : null)
    let sql = 'CREATE TABLE `' + this.name + '` (\n\t' + fields.join(',\n\t') + '\n)'
    if (engine) sql += ' ENGINE=' + engine
    if (charset) sql += ' DEFAULT CHARSET=' + charset
    if (collate) sql += ' COLLATE=' + collate
    sql += ';'

    for (i in this.indexes) {
      index = this.indexes[i]
      sql += '\nCREATE INDEX `' + i + '` ON `' + this.name + '` (' + index.join(',') + ');'
    }
    for (i in this.uniqueIndexes) {
      index = this.uniqueIndexes[i]
      sql += '\nCREATE UNIQUE INDEX `' + i + '` ON `' + this.name + '` (' + index.join(',') + ');'
    }
    return sql
  }

  getInsertData (data) {
    const fields = []
    const values = []

    for (const k in data) {
      if(!this.fields[k]) continue;
      fields.push(k)
      values.push(this.fields[k].getSqlValue(data[k]))
    }

    let params = '?,'.repeat(values.length)
    params = params.substr(0, params.length - 1)

    return {
      fields: fields, // The Field names
      values: values, // The Values
      params: params // The SQL param placeholders
    }
  }

  insert(conn, data, callback) {
    var { fields, params, values } = this.getInsertData(data)
    conn.query('INSERT INTO `'+this.name+'` (`'+fields.join('`,`')+'`) VALUES ('+params+')', values, callback)
  }

  getUpdateData (data) {
    const assigns = []
    const values = []

    for (const k in data) {
      assigns.push('?? = ?')
      values.push(this.name + '.' + this.fields[k].name)
      values.push(this.fields[k].getSqlValue(data[k]))
    }

    return {
      assigns: assigns, // The field assignments (field1=?, field2=?)
      values: values // The Values (value1, value2)
    }
  }

  addHandler(operation, fn) {
    this.handlers[operation] = fn
  }
}

module.exports = Table
