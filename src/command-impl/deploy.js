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
  // console.log(JSON.stringify(configs))

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
    console.log(JSON.stringify(accessControlArgs))
    functions = functions.concat(accessControlArgs)
  }

  // performance

  // video

  // back to origin

  // cache

  // https

  // console.log(JSON.stringify(functions))
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
    await deleteConfig(credentials, domainName, configs, "green_manager")
  } else {
    console.log(red(`invalid green manager parameter: ${JSON.stringify(others)}`))
  }
}

const handleAccessControl = async (credentials, domainName, configs, accessControl) => {
  let functions = []
  if (!accessControl) {
    // 删除所有accessControl相关的配置操作
    await deleteConfig(credentials, domainName, configs,["ip_allow_list_set", "ip_black_list_set", "referer_white_list_set", "referer_black_list_set", "ali_ua"])
  } else {
    // Referer
    if (accessControl.Referer) {
      const whiteList = accessControl.Referer.White
      const blackList = accessControl.Referer.Black
      if (whiteList && !blackList) {
        // TODO 在页面上的allow_empty是不可以配置的，没必要写到template中。
        let functionArgs = [newFunctionArg("allow_empty", "off"), newFunctionArg("refer_domain_allow_list", whiteList.List.join(","))]
        functions.push(newFunction("referer_white_list_set", functionArgs))
        await deleteConfig(credentials, domainName, configs,["referer_black_list_set"])
      } else if (!whiteList && blackList) {
        let functionArgs = [newFunctionArg("allow_empty", "off"), newFunctionArg("refer_domain_deny_list", blackList.List.join(","))]
        functions.push(newFunction("referer_black_list_set", functionArgs))
        await deleteConfig(credentials, domainName, configs,["referer_white_list_set"])
      } else {
        console.log(red(`invalid access control parameter for referer: ${JSON.stringify(accessControl.Referer)}`))
      }
    } else {
      await deleteConfig(credentials, domainName, configs,["referer_white_list_set", "referer_black_list_set"])
    } // end of 'if (accessControl.Referer) '

    // ip
    if (accessControl.Ip) {
      const whiteList = accessControl.Ip.WhiteList
      const blackList = accessControl.Ip.BlackList
      if (whiteList && !blackList) {
        let functionArgs = [newFunctionArg("ip_list", whiteList.join(","))]
        functions.push(newFunction("ip_allow_list_set", functionArgs))
        await deleteConfig(credentials, domainName, configs, ["ip_black_list_set"])
      } else if (!whiteList && blackList) {
        let functionArgs = [newFunctionArg("ip_list", blackList.join(","))]
        functions.push(newFunction("ip_black_list_set", functionArgs))
        await deleteConfig(credentials, domainName, configs, ["ip_allow_list_set"])
      } else {
        console.log(red(`invalid access control parameter for ip: ${JSON.stringify(accessControl.Ip)}`))
      }
    } else {
      await deleteConfig(credentials, domainName, configs,["ip_allow_list_set", "ip_black_list_set"])
    } // end of 'if (accessControl.Ip)'

    // user agent
    if (accessControl.UserAgent) {
      const whiteList = accessControl.UserAgent.WhiteList
      const blackList = accessControl.UserAgent.BlackList
      if (whiteList && !blackList) {
        let functionArgs = [newFunctionArg("type", "white"), newFunctionArg("ua", whiteList.join("|"))]
        functions.push(newFunction("ali_ua", functionArgs))
        await deleteConfig(credentials, domainName, configs, ["ali_ua"])
      } else if (!whiteList && blackList) {
        let functionArgs = [newFunctionArg("type", "black"), newFunctionArg("ua", blackList.join("|"))]
        functions.push(newFunction("ali_ua", functionArgs))
        await deleteConfig(credentials, domainName, configs, ["ali_ua"])
      } else {
        console.log(red(`invalid access control parameter for user agent: ${JSON.stringify(accessControl.UserAgent)}`))
      }
    } else {
      await deleteConfig(credentials, domainName, configs,["ali_ua"])
    } // end of 'if (accessControl.UserAgent)'

    // Auth
    if (accessControl.Auth) {
      let auth = accessControl.Auth
      if (auth.Type !== "no_auth" && auth.Type !== "type_a" && auth.Type !== "type_b" && auth.Type !== "type_c") {
        console.log(red(`invalid access control parameter for auth: ${JSON.stringify(accessControl.Auth)}`))
      } else {
        let functionArgs = [
          newFunctionArg("auth_type", auth.Type),
          newFunctionArg("auth_key1", auth.Key1),
          newFunctionArg("auth_key2", auth.Key2),
          newFunctionArg("ali_auth_delta", auth.Delta),
        ]
        functions.push(newFunction("aliauth", functionArgs))
      }
    } else {
      let functionArgs = [
        newFunctionArg("auth_type", "no_auth"),
        newFunctionArg("auth_key1", "auth_key1"),
        newFunctionArg("auth_key2", "auth_key2"),
        newFunctionArg("ali_auth_delta", 1800),
      ]
      functions.push(newFunction("aliauth", functionArgs))
    } // end of 'if (accessControl.Auth)'

  } // end of 'if (!accessControl)'
  return functions
}

// TODO delete config after all config
const deleteConfig = async (credentials, domainName, configs, configNameList) => {
  for (const c of configs.DomainConfigs.DomainConfig) {
    if (configNameList.indexOf(c.FunctionName) !== -1)
      await DeleteSpecificConfig(credentials, domainName, c.ConfigId)
  }
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
