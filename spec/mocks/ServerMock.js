const Mock = require('./Mock')

class ServerMock extends Mock {
  constructor (options = {}) {
    super(options)

    this.mockMethod('redirect', ['url'])
    this.mockMethod('status401End', ['req', 'res', 'data'])
    this.mockMethod('status404End', ['req', 'res', 'data'])
    this.mockMethod('status500End', ['req', 'res', 'error'])
  }
}

module.exports = ServerMock
