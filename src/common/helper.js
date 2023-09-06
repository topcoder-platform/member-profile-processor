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
  return m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Function to get challenge details with provided query
 * @param {Object} queryParams query params for filter
 * @returns {Promise} challenge description
 */
async function getChallengeDetails(queryParams) {
  const token = await getM2Mtoken()
  logger.info(
    `fetching challenge detail using query params: ${JSON.stringify(
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
  logger.info(`fetching submissions for a given challenge: ${challengeId}`)

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
 * Function to initiate the rating calculation
 * @param {string} roundId roundId
 * @returns {Object} response 
 */
async function initiateRatingCalculation(roundId) {
  logger.debug("getting token")
  const token = await getM2Mtoken()

  logger.debug(`initiate rating calculation for roundId: ${ roundId }`)

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
 * Function to initiate loadCoders
 * @param {string} roundId roundId
 * @returns {Object} response 
 */
async function initiateLoadRatings(roundId) {
  logger.debug("getting token")
  const token = await getM2Mtoken()
  
  logger.debug(`initiate load ratings for roundId: ${ roundId }`)

  const data = JSON.stringify({
    "roundId": roundId
  });

  const response = await getV5Api(token).post('/ratings/mm/load').send(data)
  const content = _.get(response.body, '[0]')

  if (content) {
    return content
  }

  return null  
}

/**
 * Function to initiate loadCoders
 * @returns {Object} response 
 */
async function initiateLoadCoders() {
  logger.debug("getting token")
  const token = await getM2Mtoken()
  
  logger.debug('initiate load coders')

  const response = await getV5Api(token).post('/ratings/coders/load').send()
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

/**
 * Function to update `loadlong.xml` file
 * @param {array} roundId
 */
async function updateLoadLongXML(roundId) {
  try {
    const data = fs.readFileSync('loadlongORG.xml', 'utf-8')
    parseString(data, function (err, result) {
      if (err) throw new Error(error)

      let updateData = result
      updateData.loadDefinition.sourcedb[0] = updateData.loadDefinition.sourcedb[0].replace('#{INFORMIXSERVER}', config.get('INFORMIX.HOST') + ':' + config.get('INFORMIX.PORT'))
      updateData.loadDefinition.sourcedb[0] = updateData.loadDefinition.sourcedb[0].replace('#{INFORMIXPASSWORD}', config.get('INFORMIX.PASSWORD'))

      updateData.loadDefinition.targetdb[0] = updateData.loadDefinition.targetdb[0].replace('#{DWWAREHOUSE}', config.get('DW.HOST') + ':' + config.get('DW.PORT'))
      updateData.loadDefinition.targetdb[0] = updateData.loadDefinition.targetdb[0].replace('#{DWPASSWORD}', config.get('DW.PASSWORD'))

      updateData.loadDefinition.load[0].parameterList[0].parameter[0]['$'].value = roundId.toString()

      const builder = new xml2js.Builder();
      const xml = builder.buildObject(updateData);

      fs.writeFileSync('loadlong.xml', xml)
    })
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  }
}

module.exports = {
  getM2Mtoken,
  getChallengeDetails,
  getSubmissions,
  getFinalSubmissions,
  getKafkaOptions,
  initiateRatingCalculation,
  initiateLoadCoders,
  initiateLoadRatings,
  updateLoadLongXML
}
