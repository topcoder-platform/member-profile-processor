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
    logger.debug('=== marathon ratings calcualtion start ===')

    const roundId = await infxDB.getRoundId(challengeName)
    const lcrEntries = await infxDB.getLCREntries(roundId)

    logger.debug(`round id ${roundId}`)

    const submissions = await helper.getSubmissions(challengeId)
    const finalSubmissions = await helper.getFinalSubmissions(submissions)

    finalSubmissions.forEach(async submission => {
      const res = _.filter(lcrEntries, { coder_id: submission.memberId.toString() })
      if (res && res[0].attended == 'N') {
        // validate the final score and the attended flag
        await infxDB.updateLCREntry(res[0].round_id, res[0].coder_id)
      }
    })

    
    // TODO: BLOCK FOR RATING CALCULATION
    // Execute the `calculate_mm_ratings` script by passing the `round_id`


    // TODO: BLOCK FOR RATING TRANSFER FROM OLTP TO DW
    // Execute the `loadlong` script by passing the `round_id`


    // TODO: BLOCK FOR RATING TRANSFER FROM DW TO DYNAMODB
    // Execute the `loaders` script by passing the `challengeID
    
    // update loadlong.xml with the roundId
    // await helper.updateLoadLongXML(roundId)

    // execute the rating calculation
    // await exec("sh loadlong.sh", (error, stdout, stderr) => {
    //   if (error || stderr) {
    //     logger.error(error)
    //     logger.error(stderr)
    //     throw error
    //   }
    // });

    logger.debug('=== marathon ratings calcualtion end ===')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    fs.unlink('loadlong.xml')
  }
}

// Exports
module.exports = {
  calculate
}

logger.buildService(module.exports)

