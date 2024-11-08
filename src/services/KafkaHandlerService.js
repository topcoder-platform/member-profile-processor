/**
 * Service to handle kafka messages
 */

const config = require('config')

const MarathonRatingsService = require('./MarathonRatingsService')
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

        if (challengeDetails.legacy.subTrack.toLowerCase() === 'marathon_match') {
          await MarathonRatingsService.calculate(challengeDetails.id, challengeDetails.legacyId)
        }
      }
      break

    case config.KAFKA_RATING_SERVICE_TOPIC:
      if (message.originator === 'rating.calculation.service') {
        if (
          message.payload.event === 'RATINGS_CALCULATION' &&
          message.payload.status === 'SUCCESS'
        ) {
          await MarathonRatingsService.loadCoders(message.payload.roundId)
        } else if (
          message.payload.event === 'LOAD_CODERS' &&
          message.payload.status === 'SUCCESS'
        ) {
          await MarathonRatingsService.loadRatings(message.payload.roundId)
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
