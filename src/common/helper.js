/**
 * Contains common helper methods
 */
const _ = require('lodash')
const config = require('config')
const fs = require('fs')
const request = require('superagent')
const parseString = require("xml2js").parseString
const prefix = require('superagent-prefix')
const xml2js = require("xml2js");

const logger = require('./logger')
const m2mAuth = require('tc-core-library-js').auth.m2m

const m2m = m2mAuth(
  _.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL'])
)

/**
 * Function to get M2M token
 * @returns {Promise}
 */
async function getM2Mtoken() {
  logger.info("Getting M2M token")
  return m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Function to get challenge details with provided query
 * from the v5 API endpoint
 * @param {Object} queryParams query params for filter
 * @returns {Promise} challenge description
 */
async function getChallengeDetails(queryParams) {
  const token = await getM2Mtoken()
  logger.info(
    `Fetching v5 challenge detail using query params: ${JSON.stringify(
      queryParams
    )}`
  )
  const response = await getV5Api(token).get('/challenges').query(queryParams)
  const content = _.get(response.body, '[0]')

  if (content) {
    return content
  }

  return null
}

/**
 * Function to fetch all the submissions for a given challenge
 * @param {string} challengeId challengeId
 * @returns {Promise<array>} submissions 
 */
async function getSubmissions(challengeId) {
  const token = await getM2Mtoken()
  logger.info(`Fetching v5 submissions for a given challenge: ${challengeId}`)

  let allSubmissions = []
  let response = {}

  const queryParams = {
    challengeId,
    perPage: 500,
    page: 1
  }

  do {
    response = await getV5Api(token).get('/submissions').query(queryParams)
    queryParams.page++
    allSubmissions = _.concat(allSubmissions, response.body)

  } while (response.headers['x-total-pages'] != response.headers['x-page'])

  return allSubmissions
}

/**
 * Function to get latest submissions of each member
 * @param {array} submissions
 * @returns {array} latest submission of individual members
 */
async function getFinalSubmissions(submissions) {
  const uniqMembers = _.uniq(_.map(submissions, 'memberId'))

  const latestSubmissions = []
  uniqMembers.forEach(memberId => {
    const memberSubmissions = _.filter(submissions, { memberId })
    const sortedSubs = _.sortBy(memberSubmissions, [function (i) { return new Date(i.created) }])
    if (_.last(sortedSubs).hasOwnProperty('reviewSummation')) {
      latestSubmissions.push(_.last(sortedSubs))
    }

  })

  return latestSubmissions
}

/**
 * Function to initiate the rating calculation.  The rating calculation is handled
 * by the ratings calculation service, so this method just makes an API call to 
 * that service
 * @param {string} roundId roundId
 * @returns {Object} response 
 */
async function initiateRatingCalculation(roundId) {
  const token = await getM2Mtoken()

  logger.debug(`Initiating rating calculation for roundId: ${ roundId }`)

  const data = JSON.stringify({
    "roundId": Number(roundId)
  });

  const response = await getV5Api(token).post('/ratings/mm/calculate').send(data).set('Content-Type', 'application/json')
  const content = _.get(response.body, '[0]')

  if (content) {
    return content
  }

  return null  
}

/**
 * Function to initiate loadRatings, via the ratings calculation service
 * @param {string} roundId roundId
 * @returns {Object} response 
 */
async function initiateLoadRatings(roundId) {
  const token = await getM2Mtoken()
  
  logger.debug(`Initiating load ratings for roundId: ${ roundId }`)

  const data = JSON.stringify({
    "roundId": roundId
  });

  const response = await getV5Api(token).post('/ratings/mm/load').send(data).set('Content-Type', 'application/json')
  const content = _.get(response.body, '[0]')

  if (content) {
    return content
  }

  return null  
}

/**
 * Function to initiate loadCoders, via the ratings calculation service
 * @returns {Object} response 
 */
async function initiateLoadCoders(roundId) {
  const token = await getM2Mtoken()
  
  logger.debug(`Initiating load coders FOR ROUNDiD: ${ roundId }`)

  const data = JSON.stringify({
    "roundId": roundId
  });

  const response = await getV5Api(token).post('/ratings/coders/load').send(data).set('Content-Type', 'application/json')
  const content = _.get(response.body, '[0]')

  if (content) {
    return content
  }

  return null  
}


/**
 * Helper function returning prepared superagent instance for using with v5 challenge API.
 * @param {String} token M2M token value
 * @returns {Promise<Object>} superagent instance configured with Authorization header and API url prefix
 */
function getV5Api(token) {
  return request
    .agent()
    .use(prefix(config.V5_API_URL))
    .set('Authorization', `Bearer ${token}`)
}

/**
 * Get Kafka options from configuration file.
 * @return Kafka options from configuration file.
 */
function getKafkaOptions() {
  const options = {
    connectionString: config.KAFKA_URL,
    groupId: config.KAFKA_GROUP_ID
  }
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = {
      cert: config.KAFKA_CLIENT_CERT,
      key: config.KAFKA_CLIENT_CERT_KEY
    }
  }
  return options
}

module.exports = {
  getM2Mtoken,
  getChallengeDetails,
  getSubmissions,
  getFinalSubmissions,
  getKafkaOptions,
  initiateRatingCalculation,
  initiateLoadCoders,
  initiateLoadRatings
}
