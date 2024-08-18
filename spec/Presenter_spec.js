const path = require('path')
const Presenter = require('../lib/Presenter')

describe('Presenter', () => {
  let fixuresPres

  beforeEach(() => {
    fixuresPres = new Presenter({ path: path.join(__dirname, './fixtures/presenter') })
    fixuresPres.load()
  })

  describe('present', () => {
    it('Should return data if the presenter does not exist', () => {
      const data = { test: 'value' }
      const result = fixuresPres.present(data, 'nope.nopenope')

      expect(result.test).toEqual('value')
    })

    it('Should remove non declared field', () => {
      const data = { private_key: 'to remove', name: 'name', email: 'email', id: '3479c41e-0fc4-4641-8623-baf7d8e2ec47' }

      const result = fixuresPres.present(data, 'test')

      expect(result.private_key).toBeUndefined()
      expect(result.name).toEqual('name')
    })
  })

  describe('presentArray', () => {
    it('Should return data if the presenter does not exist', () => {
      const data = [{ private_key: 'to remove', name: 'name', email: 'email', id: '3479c41e-0fc4-4641-8623-baf7d8e2ec47' }]

      const result = fixuresPres.presentArray(data, 'nope.nopenope')

      expect(result).toEqual(data)
    })

    it('Should remove non declared field in array of types', () => {
      const data = [{ private_key: 'to remove', name: 'name', email: 'email', id: '3479c41e-0fc4-4641-8623-baf7d8e2ec47' }]

      const result = fixuresPres.presentArray(data, 'test')

      expect(result[0].private_key).toBeUndefined()
      expect(result[0].name).toEqual('name')
    })
  })
})
