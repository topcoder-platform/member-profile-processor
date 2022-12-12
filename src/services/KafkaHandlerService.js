/**
 * Service to handle kafka messages
 */

const AWS = require('aws-sdk')
const config = require('config')

const MrathonRatingsService = require('./MarathonRatingsService')
const helper = require('../common/helper')
const logger = require('../common/logger')

const eventBridge = new AWS.EventBridge({
  credentials: {
    accessKeyId: config.get('AWS.ACCESS_KEY_ID'),
    secretAccessKey: config.get('AWS.SECRET'),
  },
  region: config.get('AWS.REGION'),
});

async function handle(message) {
  switch (message.topic) {
    // handle review phase end mesasges
    case config.KAFKA_AUTOPILOT_NOTIFICATIONS_TOPIC:
      if (
        message.payload.phaseTypeName.toLowerCase() === 'review' &&
        message.payload.state.toLowerCase() === 'end'
      ) {
        // get the challenge details
        const challengeDetails = await helper.getChallengeDetails({
          legacyId: message.payload.projectId
        })

        if (challengeDetails.legacy.subTrack.toLowerCase() === 'develop_marathon_match') {
          await MrathonRatingsService.calculate(challengeDetails.id, challengeDetails.name)
        }

        // update skills for the members of the completed challenge
        const params = {
          Entries: [
            {
              Source: 'skills-etl-initiate',
              Detail: '{ "challengeId": "challengeDetails.id" }',
              Resources: ['resource1', 'resource2'], //update value
              DetailType: 'myDetailType', //update value
            },
          ],
        }

        await eventBridge.putEvents(params).promise();
      }
      break
  }
}

// Exports
module.exports = {
  handle
}

logger.buildService(module.exports)
