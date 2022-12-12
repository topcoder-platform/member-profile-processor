/**
 * Contains Informix DB related functions
 */
const _ = require('lodash')
const config = require('config')
const ifxn = require('ifxnjs')

const logger = require('./logger')

const informixConnString =
  'SERVER=' +
  config.get('INFORMIX.SERVER') +
  ';DATABASE=' +
  config.get('INFORMIX.DATABASE') +
  ';HOST=' +
  config.get('INFORMIX.HOST') +
  ';Protocol=' +
  config.get('INFORMIX.PROTOCOL') +
  ';SERVICE=' +
  config.get('INFORMIX.PORT') +
  ';DB_LOCALE=' +
  config.get('INFORMIX.DB_LOCALE') +
  ';UID=' +
  config.get('INFORMIX.USER') +
  ';PWD=' +
  config.get('INFORMIX.PASSWORD')

/**
 * Get Informix connection using the configured parameters
 * @return {Object} Informix connection
 */
async function getInformixConnection() {
  return ifxn.openSync(informixConnString)
}

/**
 * Get `round_id` for the given challenge
 * @param {string} challengeName challenge name
 * @returns {array} rows from round table 
 */
async function getRoundId(challengeName) {
  const informixSession = await getInformixConnection()
  try {
    const res = informixSession.querySync('select * from round r, contest c where c.name = ? and c.contest_id = r.contest_id', [challengeName]);

    return res[0].round_id
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    await informixSession.closeSync();
  }

}

/**
 * Get entries of `long_comp_result` table for the given `round_id`
 * @param {string} roundId round id
 * @returns {array} rows from long_comp_result table 
 */
async function getLCREntries(roundId) {
  const informixSession = await getInformixConnection()
  try {
    return informixSession.querySync('select * from long_comp_result lcr where lcr.round_id = ?', [roundId]);
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    await informixSession.closeSync();
  }
}

/**
 * Update entry of `long_comp_result` table for the given `round_id` and `coder_id`
 * @param {string} roundId round id
 * @param {string} coderId member id
 * @param {Object} updateParams update key and value
 * @returns {array} rows from long_comp_result table 
 */
async function updateLCREntry(roundId, coderId) {
  const informixSession = await getInformixConnection()
  try {
    const updateValues = []
    let queryString = 'update long_comp_result set attended = ? where round_id = ? and coder_id = ?'

    updateValues.push('Y')
    updateValues.push(roundId)
    updateValues.push(coderId)

    await informixSession.querySync(queryString, updateValues);
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    await informixSession.closeSync();
  }
}


module.exports = {
  getRoundId,
  getLCREntries,
  updateLCREntry
}
