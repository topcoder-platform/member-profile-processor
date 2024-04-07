/**
 * MM Rating Service for Marathon Matches
 */

const _ = require('lodash')
const { async } = require('q')
const config = require('config')
const fs = require('fs')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const helper = require('../common/helper')
const infxDB = require('../common/informixDB')
const logger = require('../common/logger')

async function calculate(challengeId, challengeName) {
  try {
    logger.debug('=== Marathon Match ratings calculation start ===')

    const roundId = await infxDB.getRoundId(challengeId)

    logger.debug(`round id ${roundId}`)

    const lcrEntries = await infxDB.getLCREntries(roundId)

    const submissions = await helper.getSubmissions(challengeId)
    const finalSubmissions = await helper.getFinalSubmissions(submissions)

    finalSubmissions.forEach(async submission => {
      const res = _.filter(lcrEntries, { coder_id: submission.memberId.toString() })
      if (res && res[0].attended == 'N') {
        // validate the final score and the attended flag
        await infxDB.updateLCREntry(res[0].round_id, res[0].coder_id)
      }
    })
    
    // BLOCK FOR RATING CALCULATION
    logger.debug(`=== initiate rating calculatoin for  round: ${roundId } ===`)
    const result = await helper.initiateRatingCalculation(roundId)

    logger.debug('=== Marathon Match ratings calculation success ===')
  } catch (error) {
    logger.debug('=== Marathon Match ratings calculation failure ===')
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    logger.debug('=== Marathon Match ratings calculation end ===')
  }
}

async function loadRatings(roundId) {
  try {
    logger.debug('=== load ratings :: start ===')

    const result = await helper.initiateLoadRatings(roundId)

    logger.debug('=== load ratings :: end ===')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  }
}

async function loadCoders(roundId) {
  try {
    logger.debug('=== load coders :: start ===')

    const result = await helper.initiateLoadCoders(roundId)

    logger.debug('=== load coders :: end ===')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  }
}

// Exports
module.exports = {
  calculate,
  loadCoders,
  loadRatings
}

logger.buildService(module.exports)

