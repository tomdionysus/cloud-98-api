const Currency = requireServer('Currency')

module.exports = {
  short (amount, mode) {
    amount = amount.toString()
    switch (mode) {
      case Currency.HTML:
        return '&sect;' + amount
      case Currency.Unicode:
        return '§' + amount
      case Currency.ASCII:
      default:
        return amount
    }
  },

  long (amount, mode) {
    return 'XXX ' + module.exports.short(amount, mode)
  }

}
