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
  let ipv6Args = await handleIpv6(credentials, domainName, configs, ipv6)
  if (ipv6Args) {
    functions.push(ipv6Args)
  }

  // other
  let otherArgs = await handleOthers(credentials, domainName, configs, others)
  if (otherArgs) {
    functions.push(otherArgs)
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

// TODO 当前region只支持all(*)配置
const handleIpv6 = async (credentials, domainName, configs, ipv6) => {
  let ipv6Args
  let functionArgs =  [{
    "argName":"region",
    "argValue":"*"
  }]
  if (ipv6 && ipv6.Enable === true) {
    functionArgs.push({"argName":"switch", "argValue":"on" })
  } else if (JSON.stringify(ipv6) === "{}" || (ipv6 && ipv6.Enable === false)) {
    functionArgs.push({"argName":"switch", "argValue":"off"})
  } else {
    console.log(red(`invalid ipv6 parameter: ${JSON.stringify(ipv6)}`))
  }
  ipv6Args = {
    "functionArgs": functionArgs,
    "functionName":"ipv6",
  }
  return ipv6Args
}

const handleOthers = async (credentials, domainName, configs, others) => {
  if (others && others.GreenManager === "enable") {
    let otherArgs
    // console.log(others)
    let functionArgs = {
      "argName":"enable",
      "argValue":"on"
    }

    otherArgs = {
      "functionArgs": new Array(functionArgs),
      "functionName":"green_manager",
    }
    return otherArgs
  } else if (JSON.stringify(others) === "{}" || (others && others.GreenManager === "disable")) {
    for (const c of configs.DomainConfigs.DomainConfig) {
      if (c.FunctionName === "green_manager") {
        await DeleteSpecificConfig(credentials, domainName, c.ConfigId)
        break
      }
    }
  } else {
    console.log(red(`invalid green manager parameter: ${JSON.stringify(others)}`))
  }
}

module.exports = {
  deployImpl: deploy
}
