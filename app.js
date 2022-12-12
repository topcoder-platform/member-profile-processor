/**
 * application entry point
 */

global.Promise = require('bluebird')

const config = require('config')
const healthcheck = require('topcoder-healthcheck-dropin')
const Kafka = require('no-kafka')

const helper = require('./src/common/helper')
const logger = require('./src/common/logger')
const KafkaHandlerService = require('./src/services/KafkaHandlerService')

// start Kafka consumer
logger.info('=== start kafka consumer ===')

const kafka_options = helper.getKafkaOptions()
const consumer = new Kafka.GroupConsumer(kafka_options)

// data handler
const dataHandler = (messageSet, topic, partition) =>
  Promise.each(messageSet, (m) => {
    const message = m.message.value.toString('utf8')

    logger.info(
      `Handle kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${m.offset}; Message: ${message}.`
    )

    let messageJSON

    try {
      messageJSON = JSON.parse(message)
    } catch (error) {
      logger.error('Invalid message JSON.')
      logger.error(error)
      return
    }

    logger.debug(JSON.stringify(messageJSON))

    return KafkaHandlerService.handle(messageJSON)
      .then(() => { })
      .catch((err) => {
        logger.error('logging full error')
        logger.logFullError(err)
      })
      .finally(() => {
        logger.info('committing offset')
        consumer.commitOffset({ topic, partition, offset: m.offset })
      })
  })

// check if there is kafka connection alive
function check() {
  if (
    !consumer.client.initialBrokers &&
    !consumer.client.initialBrokers.length
  ) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach((conn) => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

consumer
  .init([
    {
      subscriptions: [config.KAFKA_AUTOPILOT_NOTIFICATIONS_TOPIC],
      handler: dataHandler
    }
  ])
  // consume configured topics
  .then(() => {
    logger.info('initilized.....')
    healthcheck.init([check])
    logger.debug('consumer initialized successfully')
  })
  .catch(logger.logFullError)

module.exports = {
  kafkaConsumer: consumer
}
