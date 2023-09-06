/**
 * The configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,

  // kafka configs
  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  KAFKA_CLIENT_CERT:
    process.env.KAFKA_CLIENT_CERT,
  KAFKA_CLIENT_CERT_KEY:
    process.env.KAFKA_CLIENT_CERT_KEY,
  KAFKA_GROUP_ID:
    process.env.KAFKA_GROUP_ID || 'member-profile-processor-group-consumer',

  // kafka topcis to listen
  KAFKA_AUTOPILOT_NOTIFICATIONS_TOPIC:
    process.env.KAFKA_AUTOPILOT_NOTIFICATIONS_TOPIC ||
    'notifications.autopilot.events',
  KAFKA_RATING_SERVIE_TOPIC: process.env.KAFKA_RATING_SERVIE_TOPIC || 'notificaiton.rating.calculation',
  

  // oatuh details
  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  // API endpoints
  V5_API_URL: process.env.V5_API_URL || 'https://api.topcoder-dev.com/v5',

  // Informix DB
  INFORMIX: {
    SERVER: process.env.IFX_SERVER || 'informixoltp_tcp',
    DATABASE: process.env.IFX_DATABASE || 'common_oltp',
    HOST: process.env.IFX_HOST || 'localhost',
    PROTOCOL: process.env.IFX_PROTOCOL || 'onsoctcp',
    PORT: process.env.IFX_PORT || '2021',
    DB_LOCALE: process.env.IFX_DB_LOCALE || 'en_US.57372',
    USER: process.env.IFX_USER || 'informix',
    PASSWORD: process.env.IFX_PASSWORD || '1nf0rm1x',
  },

  DW: {
    HOST: process.env.DW_HOST || 'localhost',
    PORT: process.env.DW_PORT || '2022',
    PASSWORD: process.env.DW_PASSWORD || '1nf0rm1x',
  }
}
