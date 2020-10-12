'use strict'

const { green, yellow, blue, red} = require('colors')
const { StopCdnDomain } = require('../services/cdn')

const stop = async (inputParams) => {
  const {
    credentials,
    domainName
  } = inputParams

  await StopCdnDomain(credentials, domainName)
  console.log(red('domain ' + domainName + ' stopped'))
}

module.exports = {
  stopImpl: stop
}
