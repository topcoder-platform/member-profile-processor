/**
 * MM Rating Service for Marathon Matches
 */

const _ = require('lodash')
const { async } = require('q')
const config = require('config')
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

    const submissions = await helper.getSubmissions(challengeId)
    const finalSubmissions = await helper.getFinalSubmissions(submissions)

    finalSubmissions.forEach(async submission => {
      const res = _.filter(lcrEntries, { coder_id: submission.memberId.toString() })
      if (res && res[0].attended == 'N') {
        // validate the final score and the attended flag
        await infxDB.updateLCREntry(res[0].round_id, res[0].coder_id)
      }
    })

    // update loadlong.xml with the roundId
    await helper.updateLoadLongXML(roundId)

    // execute the rating calculation
    exec("sh loadlong.sh", (error, stdout, stderr) => {
      if (error || stderr) {
        throw error
      }
    });

    logger.debug('=== marathon ratings calcualtion end ===')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  }
}

// Exports
module.exports = {
  calculate
}

logger.buildService(module.exports)

