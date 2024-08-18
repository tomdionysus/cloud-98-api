const Mock = require('./Mock')

class APIClientMock extends Mock {
  constructor (options = {}) {
    super(options)

    this.mockMethod('get', ['path', 'options', 'callback'])
    this.mockMethod('post', ['path', 'data', 'options', 'callback'])
    this.mockMethod('patch', ['path', 'data', 'options', 'callback'])
    this.mockMethod('delete', ['path', 'options', 'callback'])
  }
}

module.exports = APIClientMock
