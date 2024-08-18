const moment = require('moment')
const AWS = require('aws-sdk')

const KVStore = require('./KVStore')
const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

class DynamoDBKVStore extends KVStore {
  constructor (options = {}) {
    super(options)

    this.logger = new ScopedLogger('MySQL', options.logger || new Logger())
    this.dynamo = options.dynamoClient || new AWS.DynamoDB.DocumentClient()
    this.table = options.table
  }

  set (key, data, expires, callback) {
    const c = moment().unix()
    const item = {
      id: { S: key },
      created: c,
      expires: expires + c,
      json: data
    }

    this.logger.info('(set) putItem '+key+' Expires: '+item.expires+' JSON:'+ item.json)

    this.dynamo.putItem({
      TableName: this.table,
      Item: item
    }, callback)
  }

  get (key, callback) {
    const params = {
      TableName: this.table,
      ProjectionExpression: 'id, created, expires, json',
      KeyConditionExpression: '#id = :id and expires <= :expires',
      ExpressionAttributeNames: {
        '#id': 'id'
      },
      ExpressionAttributeValues: {
        ':id': key,
        ':expires': moment()
      }
    }

    this.logger.info('(get) query '+key+' Params: '+JSON.stringify(params))

    this.dynamo.query(params, (err, item) => {
      if (err) return callback(err)
      if (!item || !item.Items || item.Items.length === 0) return callback(null, null)
      callback(null, item.Items[0].json)
    })
  }

  del (key, callback) {
    const params = { 
      TableName: this.table, 
      Item: { id: key }
    }

    this.logger.info('(del) delete '+key+' Params: '+JSON.stringify(params))

    this.dynamo.delete(params, (err, item) => {
      if (err) return callback(err)
      if (!item || !item.Items || item.Items.length === 0) return callback(null, null)
      callback(null, item.Items[0].json)
    })
  }

  incr (key, amount, callback) {
    const item = {
      id: { S: key },
    }

    console.log('(incr) updateItem '+key+' Params: '+JSON.stringify(params))

    this.dynamo.updateItem({
      TableName: this.table,
      Key: item,
      UpdateExpression: 'SET Value = Value + :incr'
      ExpressionAttributeValues: {
        ':incr': amount,
      }
      ReturnValues: 'UPDATED_NEW'
    }, (err, item) => {
      if (err) return callback(err)
      if (!item || !item.Items || item.Items.length === 0) return callback(null, null)
      callback(null, item.Items[0].json)
    })
  }

  decr (key, amount, callback) {
    const item = {
      id: { S: key },
    }

    console.log('(decr) updateItem '+key+' Params: '+JSON.stringify(params))

    this.dynamo.updateItem({
      TableName: this.table,
      Key: item,
      UpdateExpression: 'SET Value = Value - :decr'
      ExpressionAttributeValues: {
        ':decr': amount,
      }
      ReturnValues: 'UPDATED_NEW'
    }, (err, item) => {
      if (err) return callback(err)
      if (!item || !item.Items || item.Items.length === 0) return callback(null, null)
      callback(null, item.Items[0].json)
    })
  }
}

module.exports = DynamoDBKVStore
