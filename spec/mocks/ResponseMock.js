const Mock = require('./Mock')

class ResponseMock extends Mock {
  constructor (options = {}) {
    super(options)

    this.mockChainMethod('set')
    this.mockChainMethod('status')
    this.mockChainMethod('send')
    this.mockChainMethod('end')
    this.mockChainMethod('redirect')
  }
}

module.exports = ResponseMock
