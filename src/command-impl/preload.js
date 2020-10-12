'use strict'

const { green, yellow, blue, red} = require('colors')
const { DescribeCdnDomainDetail, StartCdnDomain, StopCdnDomain,
  AddCdnDomain, RemoveCdnDomain, RefreshCdnDomain, PreloadCdnDomain,
  DescribeUserDomains, TagResources, DescribeCdnDomainConfigs, SetCdnDomainConfig
} = require('../services/cdn')

const preload = async (inputParams) => {
  const {
    credentials,
    preload,
    args,
  } = inputParams

  const { Parameters: parameters = {} } = args
  const { p, path, a, area} = parameters

  let objectPath, targetArea

  let argsPath = p || path
  let argsArea = a || area
  // if args path and args area not empty, then use args
  if (argsPath || argsArea) {
    objectPath = argsPath
    targetArea = argsArea
  } else {
    objectPath = preload.Path
    targetArea = preload.Area
  }

  if (!objectPath) {
    throw new Error(`invalid parameter for refreshing, must provide path`)
  }

  await PreloadCdnDomain(credentials, objectPath, targetArea)

}

module.exports = {
  preloadImpl: preload
}
