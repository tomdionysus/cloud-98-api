const DBFunction = require('../../lib/DBFunction')

module.exports = () => {
  const f = new DBFunction('bigid', [])
  f.returns('bigint unsigned')
  f.sql('RETURN (FLOOR(1 + RAND() * POW(2,63)))')

  return f
}
