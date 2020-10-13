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
  let accessControlArgs = await handleAccessControl(credentials, domainName, configs, accessControl)
  if (accessControlArgs) {
    console.log(accessControlArgs)
    functions.push(accessControlArgs)
  }

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
  let functionArgs = [newFunctionArg("region", "*")]

  if (ipv6 && ipv6.Enable === true) {
    functionArgs.push(newFunctionArg("switch", "on" ))
  } else if (JSON.stringify(ipv6) === "{}" || (ipv6 && ipv6.Enable === false)) {
    functionArgs.push(newFunctionArg("switch", "off"))
  } else {
    console.log(red(`invalid ipv6 parameter: ${JSON.stringify(ipv6)}`))
  }
  return newFunction("ipv6", functionArgs)
}

const handleOthers = async (credentials, domainName, configs, others) => {
  if (others && others.GreenManager === "enable") {
    // console.log(others)
    let functionArgs = [newFunctionArg("enable", "on")]
    return newFunction("green_manager", functionArgs)
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

const handleAccessControl = async (credentials, domainName, configs, accessControl) => {
  if (!accessControl) {
    // 删除配置操作
  } else {
    if (accessControl.Referer) {
      const whiteList = accessControl.Referer.White
      const blackList = accessControl.Referer.Black
      if (whiteList && !blackList) {
        // TODO 在页面上的allow_empty是不可以配置的，没必要写到template中。
        let functionArgs = [newFunctionArg("allow_empty", "off"), newFunctionArg("refer_domain_allow_list", whiteList.List.join(","))]
        return newFunction("referer_white_list_set", functionArgs)
      } else if (!whiteList && blackList) {
        let functionArgs = [newFunctionArg("allow_empty", "off"), newFunctionArg("refer_domain_deny_list", blackList.List.join(","))]
        return newFunction("referer_black_list_set", functionArgs)
      } else {
        console.log(red(`invalid access control parameter for referer: ${JSON.stringify(accessControl.Referer)}`))
      }
    } else {
      // else for : if (accessControl.Referer)
      for (const c of configs.DomainConfigs.DomainConfig) {
        if (c.FunctionName === "referer_white_list_set" || c.FunctionName === "referer_black_list_set") {
          await DeleteSpecificConfig(credentials, domainName, c.ConfigId)
          break
        }
      }
    }
  }

  // functionArgs.push({"argName":"switch", "argValue":"on" })
  // } else if (JSON.stringify(ipv6) === "{}" || (ipv6 && ipv6.Enable === false)) {
  //   functionArgs.push({"argName":"switch", "argValue":"off"})
  // } else {
  //   console.log(red(`invalid ipv6 parameter: ${JSON.stringify(ipv6)}`))
  // }
  // ipv6Args = {
  //   "functionArgs": functionArgs,
  //   "functionName":"ipv6",
  // }
  // return ipv6Args
}

function newFunctionArg(name, value) {
  return {
    "argName": name,
    "argValue": value
  }
}

function newFunction(name, args) {
  return {
    "functionArgs": args,
    "functionName": name,
  }
}



module.exports = {
  deployImpl: deploy
}
