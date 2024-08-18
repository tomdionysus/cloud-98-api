const Currency = requireServer('Currency')

module.exports = {
  short (amount, mode) {
    amount = (amount / 100).toString()
    switch (mode) {
      case Currency.HTML:
        return '&dollar;' + amount
      case Currency.Unicode:
      case Currency.ASCII:
      default:
        return '$' + amount
    }
  },

  long (amount, mode) {
    return 'NZD ' + module.exports.short(amount, mode)
  }

}
