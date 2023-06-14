/**
 * Service to handle kafka messages
 */

const config = require('config')

const MrathonRatingsService = require('./MarathonRatingsService')
const helper = require('../common/helper')
const logger = require('../common/logger')

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
      }
      break
  }
}

// Exports
module.exports = {
  handle
}

logger.buildService(module.exports)
