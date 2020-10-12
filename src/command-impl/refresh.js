'use strict'

const { green, yellow, blue, red} = require('colors')
const { DescribeCdnDomainDetail, StartCdnDomain, StopCdnDomain,
  AddCdnDomain, RemoveCdnDomain, RefreshCdnDomain, PreloadCdnDomain,
  DescribeUserDomains, TagResources, DescribeCdnDomainConfigs, SetCdnDomainConfig
} = require('../services/cdn')

const refresh = async (inputParams) => {
  const {
    credentials,
    refresh,
    args
  } = inputParams

  const { Parameters: parameters = {} } = args
  const { p, path, t, type} = parameters

  let objectPath, objectType

  let argsPath = p || path
  let argsType = t || type
  // if args path and args type not empty, then use args
  if (argsPath && argsType) {
    objectPath = argsPath
    objectType = argsType
  } else if (!argsPath && !argsType) {
    // if args path and args type are both empty, then param from yaml
    objectPath = refresh.Path
    objectType = refresh.Type
  }

  if (!objectType || !objectPath) {
    throw new Error(`invalid parameter for refreshing, must provide path and type `)
  }

  await RefreshCdnDomain(credentials, objectPath, objectType)
}

module.exports = {
  refreshImpl: refresh
}
