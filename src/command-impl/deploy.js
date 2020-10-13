'use strict'

const { green, yellow, blue, red} = require('colors')
const {
  AddCdnDomain, DescribeUserDomains, UpdateTagResources, DescribeCdnDomainConfigs, SetCdnDomainConfig, DeleteSpecificConfig
} = require('../services/cdn')

const deploy = async (inputParams) => {
  const {
    credentials, state, args, cdnDomain, tags, ipv6,
    others, force, accessControl, performance, video,
    backToOrigin, cache, https, refresh, preload, domainName,
  } = inputParams

  let userDomains = await DescribeUserDomains(credentials, domainName)
  let domainExist = false
  for (const domain of userDomains.Domains.PageData) {
    if (domain.DomainName === domainName) {
      domainExist = true
    }
  }
  if (!domainExist) {
    await AddCdnDomain(credentials, cdnDomain)
  }
  // tags related logic
  await UpdateTagResources(credentials, domainName, tags)
  // config cdn domain
  let configs = await DescribeCdnDomainConfigs(credentials, domainName, "")
  console.log(JSON.stringify(configs))

  let functions = []

  // ipv6

  // other
  if (others && others.GreenManager === "enable") {
    let otherArgs
    console.log(others)
    let functionArgs = {
      "argName":"enable",
      "argValue":"on"
    }

    otherArgs = {
      "functionArgs": new Array(functionArgs),
      "functionName":"green_manager",
    }
    functions.push(otherArgs)
  } else if (!others || (others && others.GreenManager === "disable")) {
    for (const c of configs.DomainConfigs.DomainConfig) {
      if (c.FunctionName === "green_manager") {
        await DeleteSpecificConfig(credentials, domainName, c.ConfigId)
        break
      }
    }
  } else {
    console.log(red(`invalid green manager parameter: ${JSON.stringify(others)}`))
  }

  // http/https

  // access control

  // performance

  // video

  // back to origin

  // cache

  // https

  console.log(JSON.stringify(functions))
  if (functions.length !== 0) {
    await SetCdnDomainConfig(credentials, domainName, JSON.stringify(functions))
  }
}

module.exports = {
  deployImpl: deploy
}
