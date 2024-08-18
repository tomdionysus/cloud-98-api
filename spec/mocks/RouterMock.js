const Mock = require('./Mock')

class RouterMock extends Mock {
  constructor (options = {}) {
    super(options)

    this.mockMethod('register', ['verb', 'route', 'handler'])
  }
}

module.exports = RouterMock
