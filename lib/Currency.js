class Currency {
  static formatShort (amount, currency = Currency.NZD) {
    const disp = Currency.fixup(amount, currency)
    return currency.id + ' ' + currency.symbol + disp
  }

  static formatLong (amount, currency = Currency.NZD) {
    const disp = Currency.fixup(amount, currency)
    return currency.symbol + disp + ' ' + currency.name + ' (' + currency.id + ')'
  }

  static format (amount, currency = Currency.NZD) {
    const disp = Currency.fixup(amount, currency)
    return currency.symbol + disp
  }

  static fixup (amount, currency = Currency.NZD) {
    if (!currency) { return 'UNKNOWN' }
    const disp = Math.round(amount).toString()
    var amt = disp.substr(0, disp.length - currency.decimalplaces)
    return (amt==='' ? '0' : amt) + currency.seperator + disp.substr(-currency.decimalplaces)
  }

  static parse (string, currency = Currency.NZD) {
    if (!currency) { return 'UNKNOWN' }
    const r = new RegExp('/[^' + currency.seperator + ']/i')
    const i = string.toString().replace(r, '')
    const j = i.replace(currency.seperator, '.')
    const f = parseFloat(j)
    return Math.round(f * (Math.pow(10, currency.decimalplaces)))
  }
}

Currency.NZD = { id: 'NZD', name: 'New Zealand dollar', decimalplaces: 2, symbol: '$', seperator: '.' }

module.exports = Currency
