#!/usr/local/bin/node

const Logger = require('../lib/Logger')
const Schema = require('../lib/Schema')
const fs = require('fs')
const path = require('path')

function main () {
  const logger = new Logger()

  schema = new Schema({ logger: logger })
  schema.load()

  fs.writeFileSync(path.join(__dirname, '../sql/create_db.sql'), '-- Generated ' + (new Date().toISOString()) + '\n\n' + schema.getSqlCreate())
}

main()
