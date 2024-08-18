const path = require('path')

requireController = (p) => { return require('../../server/controller/' + p) }
requireServer = (p) => { return require('../../lib/' + p) }
requireMock = (p) => { return require('../mocks/' + p) }
fixturesDir = (p) => { return path.join(__dirname, '../fixtures', p) }
