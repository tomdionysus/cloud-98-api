const Template = require('../lib/Template')
const MySQLMock = require('./mocks/MySQLMock')

describe('Template', () => {
  it('Should allow new', () => {
    const x1 = new Template({})
    const x2 = new Template({})

    expect(x1).not.toBe(x2)
  })
})
