const _ = require('underscore')

module.exports = {
  // Turns a DB result into a collection suotable for the {{> select}} partial
  tableToSelect: function (result, keyField, valueField, sortBy) {
    const output = []
    result = _.sortBy(result, function (item) { return item[sortBy] })
    for (let i = 0; i < result.length; i++) {
      const item = result[i]
      output.push({ id: item[keyField], name: item[valueField] })
    }
    return output
  },

  // Filters a DB result set by fields/values
  filter: function (result, filters) {
    const output = []
    for (let i = 0; i < result.length; i++) {
      const item = result[i]
      let drop = false
      for (const k in filters) {
        if (item[k] !== filters[k]) { drop = true; break }
      }
      if (!drop) output.push(item)
    }
    return output
  },

  // Turns a DB result into an object of { key: <dbitem>, ... }
  tableToObject: function (result, keyField) {
    const output = {}
    for (let i = 0; i < result.length; i++) {
      const item = result[i]
      output[item[keyField]] = item
    }
    // TODO: Sortby
    return output
  },

  // Turns an object into an array of its values, sorted by value[sortBy]
  objectToSortedArray: function (obj, sortBy, descending) {
    let output = _.values(obj)
    output = _.sortBy(output, function (item) { return item[sortBy] })
    if (descending) output = output.reverse()
    return output
  }
}
