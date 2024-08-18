#!/usr/bin/node
const memcached = require('memcached')
const url = require('url')

const APIServer = require('./lib/APIServer')
const Logger = require('./lib/Logger')
const ScopedKVStore = require('./lib/ScopedKVStore')
const MySQL = require('./lib/MySQL')
const Session = require('./lib/Session')
const Login = require('./lib/Login')
const LocalStorage = require('./lib/LocalStorage')
const MailgunMailer = require('./lib/MailgunMailer')
const Email = require('./lib/Email')
const Invoicing = require('./lib/Invoicing')
const Template = require('./lib/Template')
const RateLimiter = require('./lib/RateLimiter')
const JsonRestCrud = require('./lib/JsonRestCrud')
const Validator = require('./lib/Validator')
const OAuth2 = require('./lib/OAuth2')
const Presenter = require('./lib/Presenter')
const Schema = require('./lib/Schema')
const Router = require('./lib/Router')
const PDF = require('./lib/PDF')
const Stripe = require('./lib/Stripe')
const Verifier = require('./lib/Verifier')
const S3Storage = require('./lib/S3Storage')

const routes = require('./config/routes')
const oauthConfig = require('./config/oauth2')

function main () {
  // ENV and defaults
  const port = parseInt(process.env.PORT || '8080')
  const smtpUri = process.env.SMTP_URI || 'smtp://localhost:25'

  // Logger
  const logger = new Logger()

  const pkg = require('./package.json')

  // Boot Message
  logger.log('api.cloud98.blackraven.co.nz', '----')
  logger.log('v'+pkg.version, '----')
  logger.log('', '----')
  logger.log('Logging Level %s', '----', Logger.logLevelToString(logger.logLevel))

  try {
    var dbUrl = url.parse(process.env.DB_URI)
  } catch (err) {
    logger.error('Cannot parse env DB_URI (should be mysql://user:password@host:port/database)')
    process.exit(1)
  }

  // OpenAPI
  const openApiInfo = {
    title: 'api.cloud98.blackraven.co.nz',
    description: 'cloud98API',
    termsOfService: 'https://cloud98.blackraven.co.nz/terms_of_service',
    version: '1.0.0',
    license: {
      name: 'ISA',
      url: 'https://cloud98.blackraven.co.nz/terms_of_service'
    }
  }

  // Dependencies
  const auth = dbUrl.auth.split(':')

  const kvstore = new memcached(process.env.MEMCACHE_HOST || 'localhost:11211')

  const mysql = new MySQL({
    logger: logger,
    host: dbUrl.host,
    user: auth[0],
    database: dbUrl.pathname.substr(1),
    password: auth[1],
    kvstore: new ScopedKVStore('dbcache_', kvstore),
    mysqlOptions: { supportBigNumbers: true, bigNumberStrings: true, charset: 'utf8mb4', timezone: 'Z' }
  })

  const session = new Session({ logger: logger, kvstore: new ScopedKVStore('session_', kvstore) })
  const rateLimiter = new RateLimiter({ logger: logger, kvstore: new ScopedKVStore('ratelimiter_', kvstore) })
  const oauth2 = new OAuth2({ logger: logger, kvstore: new ScopedKVStore('oauth2_', kvstore), config: oauthConfig })

  const router = new Router()
  const publicRouter = new Router()

  const localStorage = new LocalStorage({ logger: logger })
  // const mailer = new MailgunMailer({ logger: logger, testMode: process.env.EMAIL_TEST_MODE })
  // const template = new Template({ logger: logger })
  // const email = new Email({ logger: logger, mailer: mailer, template: template })

  const invoicing = new Invoicing({ logger: logger, mysql: mysql })

  const validator = new Validator({ logger: logger })
  const presenter = new Presenter({ logger: logger })

  const stripe = new Stripe({ logger: logger, privateKey: process.env.STRIPE_SECRET_KEY })

  const schema = new Schema({ logger: logger })
  const jsonRestCrud = new JsonRestCrud({ logger: logger, schema: schema, router: router, mysql: mysql, validator: validator, presenter: presenter, info: openApiInfo })
  const pdf = new PDF({ logger: logger })

  // const device = new Device({ logger: logger, mysql: mysql, apiKey: process.env.FIREBASE_API_KEY })
  // const verifier = new Verifier({ logger: logger, mysql: mysql })

  const s3storage = new S3Storage({ logger: logger, region: process.env.AWS_REGION, bucket: process.env.AWS_DOCUMENTS_S3_BUCKET })

  const login = new Login({ logger: logger, mysql: mysql })


  // Connect Database
  mysql.connect()

  // Load & Init Schema
  schema.load()
  schema.init()

  // Load Validators
  validator.load()

  // Load Presenters
  presenter.load()

  // Load Templates
  // template.load()

  // Load Verifiers
  // verifier.load()

  // Main APIServer
  const svr = new APIServer({
    kvstore: new ScopedKVStore('cache_', kvstore),
    session: session,
    mysql: mysql,
    login: login,
    // email: email,
    invoicing: invoicing,
    rateLimiter: rateLimiter,
    validator: validator,
    presenter: presenter,
    schema: schema,
    jsonRestCrud: jsonRestCrud,
    logger: logger,
    stripe: stripe,
    stripeWebhookSigningSecret: process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
    stripePriceId: process.env.STRIPE_PRICE_ID,
    port: port,
    router: router,
    publicRouter: publicRouter,
    pdf: pdf,
    // device: device,
    // template: template,
    // verifier: verifier,
    oauth2: oauth2,
    s3storage: s3storage,
    env: process.env.ENV || 'prod'
  })

  routes.register(svr)

  // APIServer Start
  svr.start()
}

main()
