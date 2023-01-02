/**
 * Service to handle kafka messages
 */

const AWS = require('aws-sdk')
const config = require('config')

const ecs = new AWS.ECS()

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

        // update skills for the members of the completed challenge
        var params = {
          cluster: config.CLUSTER_NAME,
          taskDefinition: config.TASK_DEFINITION,
          overrides: {
            containerOverrides: [
              {
                environment: [
                  {
                    name: 'CHALLENGE_ID',
                    value: challengeDetails.id
                  }
                ]
              }
            ]
          }
        }

        ecs.runTask(params, function (error, data) {
          if (error) {
            logger.logFullError(error)
            throw new Error(error)
          }
        });
      }
      break
  }
}

// Exports
module.exports = {
  handle
}

logger.buildService(module.exports)
