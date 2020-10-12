'use strict'

const { green, yellow, blue, red} = require('colors')
const { StartCdnDomain } = require('../services/cdn')

const start = async (inputParams) => {
  const {
    credentials,
    domainName
  } = inputParams
  await StartCdnDomain(credentials, domainName)
  console.log(green('domain ' + domainName + ' started'))
}

module.exports = {
  startImpl: start
}
