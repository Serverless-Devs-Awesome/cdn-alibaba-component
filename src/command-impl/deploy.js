'use strict'

const fs = require('fs-extra')
const path = require('path')
const { green, yellow, blue, red} = require('colors')
const {
  AddCdnDomain, DescribeUserDomains, UpdateTagResources, DescribeCdnDomainConfigs, SetCdnDomainConfig,
  DeleteSpecificConfig, SetDomainServerCertificate, DescribeCdnCertificateList,
} = require('../services/cdn')

// TODO check param for each config
const deploy = async (inputParams) => {
  const {
    credentials, state, args, cdnDomain, tags, ipv6,
    others, force, accessControl, performance, video,
    backToOrigin, cache, https, domainName,
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
    // console.log(JSON.stringify(accessControlArgs))
    functions = functions.concat(accessControlArgs)
  }

  // performance
  let performanceArgs = await handlePerformance(credentials, domainName, configs, performance)
  if (performanceArgs) {
    // console.log(JSON.stringify(performanceArgs))
    functions = functions.concat(performanceArgs)
  }

  // video
  let videoArgs = await handleVideo(credentials, domainName, configs, video)
  if (videoArgs) {
    // console.log(JSON.stringify(videoArgs))
    functions = functions.concat(videoArgs)
  }

  // back to origin
  let backToOrigionArgs = await handleBackToOrigin(credentials, domainName, configs, backToOrigin)
  if (backToOrigionArgs) {
    // console.log(JSON.stringify(cacheArgs))
    functions = functions.concat(backToOrigionArgs)
  }

  // cache
  let cacheArgs = await handleCache(credentials, domainName, configs, cache)
  if (cacheArgs) {
    // console.log(JSON.stringify(cacheArgs))
    functions = functions.concat(cacheArgs)
  }

  // https
  let httpsArgs = await handleHttps(credentials, domainName, configs, https)
  if (httpsArgs) {
    console.log(JSON.stringify(httpsArgs))
    functions = functions.concat(httpsArgs)
  }

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
    // TODO remove aliauth
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

const handlePerformance = async (credentials, domainName, configs, performance) => {
  let functions = []
  if (!performance) {
    // 删除所有performance相关的配置操作
    await deleteConfig(credentials, domainName, configs,["ali_remove_args", "set_hashkey_args"])
    // TODO 删除其他配置
  } else {
    // Tesla 页面优化
    if (performance.Tesla) {
      if (performance.Tesla !== "enable" && performance.Tesla !== "disable") {
        console.log(red(`invalid performance parameter for tesla: ${JSON.stringify(performance.Tesla)}`))
      } else if (performance.Tesla === "enable") {
        let functionArgs = [newFunctionArg("enable", "on")]
        functions.push(newFunction("tesla", functionArgs))
      } else if (performance.Tesla === "disable") {
        let functionArgs = [newFunctionArg("enable", "off")]
        functions.push(newFunction("tesla", functionArgs))
      }
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("tesla", functionArgs))
    } // end of 'if (accessControl.Referer) '

    // Gzip 智能压缩
    if (performance.Gzip) {
      if (performance.Gzip !== "enable" && performance.Gzip !== "disable") {
        console.log(red(`invalid performance parameter for Gzip: ${JSON.stringify(performance.Gzip)}`))
      } else if (performance.Gzip === "enable") {
        let functionArgs = [newFunctionArg("enable", "on")]
        functions.push(newFunction("gzip", functionArgs))
      } else if (performance.Tesla === "disable") {
        let functionArgs = [newFunctionArg("enable", "off")]
        functions.push(newFunction("gzip", functionArgs))
      }
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("gzip", functionArgs))
    } // end of 'if (accessControl.Referer) '

    // Brotli 压缩
    if (performance.Brotli) {
      if (performance.Brotli !== "enable" && performance.Brotli !== "disable") {
        console.log(red(`invalid performance parameter for Brotli: ${JSON.stringify(performance.Brotli)}`))
      } else if (performance.Gzip === "enable") {
        let functionArgs = [newFunctionArg("enable", "on"), newFunctionArg("brotli_level", "1")]
        functions.push(newFunction("brotli", functionArgs))
      } else if (performance.Tesla === "disable") {
        let functionArgs = [newFunctionArg("enable", "off"), newFunctionArg("brotli_level", "1")]
        functions.push(newFunction("brotli", functionArgs))
      }
    } else {
      let functionArgs = [newFunctionArg("enable", "off"), newFunctionArg("brotli_level", "1")]
      functions.push(newFunction("brotli", functionArgs))
    } // end of 'if (accessControl.Referer) '

    // 保留参数
    if (performance.HashkeyArgs) {
      let hashKeyArgs = performance.HashkeyArgs
      let keepOssArgs = "off"
      if (hashKeyArgs.KeepOSSArgs === "enable") {
        keepOssArgs = "on"
      } else if (hashKeyArgs.KeepOSSArgs === "disable") {
        keepOssArgs = "off"
      } else {
        console.log(red(`invalid performance parameter for HashkeyArgs, invalid keepOssArgs, set keep oss args to disable : ${JSON.stringify(performance.HashkeyArgs)}`))
      }
      if (hashKeyArgs.Enable !== true && hashKeyArgs.Enable !== false) {
        console.log(red(`invalid performance parameter for HashkeyArgs, invalid enable: ${JSON.stringify(performance.HashkeyArgs)}`))
      } else if (hashKeyArgs.Enable === true) {
        let functionArgs = [newFunctionArg("hashkey_args", hashKeyArgs.Args.join(",")), newFunctionArg("keep_oss_args", keepOssArgs), newFunctionArg("disable", "on")]
        functions.push(newFunction("set_hashkey_args", functionArgs))
      } else if (hashKeyArgs.Enable === false) {
        let functionArgs = [newFunctionArg("hashkey_args", hashKeyArgs.Args.join(",")), newFunctionArg("keep_oss_args", keepOssArgs), newFunctionArg("disable", "off")]
        functions.push(newFunction("set_hashkey_args", functionArgs))
      }
    } else {
      await deleteConfig(credentials, domainName, configs, ["set_hashkey_args"])
    }

    // 过滤参数
    if (performance.RemoveArgs) {
      let removeArgs = performance.RemoveArgs
      let keepOssArgs = "off"
      if (removeArgs.KeepOSSArgs === "enable") {
        keepOssArgs = "on"
      } else if (removeArgs.KeepOSSArgs === "disable") {
        keepOssArgs = "off"
      } else {
        console.log(red(`invalid performance parameter for RemoveArgs, invalid keepOssArgs, set keep oss args to disable : ${JSON.stringify(performance.RemoveArgs)}`))
      }
      if (removeArgs.Enable !== true && removeArgs.Enable !== false) {
        console.log(red(`invalid performance parameter for RemoveArgs, invalid enable: ${JSON.stringify(performance.RemoveArgs)}`))
      } else if (removeArgs.Enable === true) {
        let functionArgs = [newFunctionArg("ali_remove_args", removeArgs.Args.join(" ")), newFunctionArg("keep_oss_args", keepOssArgs)]
        functions.push(newFunction("ali_remove_args", functionArgs))
      } else if (removeArgs.Enable === false) {
        await deleteConfig(credentials, domainName, configs, ["ali_remove_args"])
      }
    } else {
      await deleteConfig(credentials, domainName, configs, ["ali_remove_args"])
    }

  } // end of 'if (!accessControl)'
  return functions
}

const handleVideo = async (credentials, domainName, configs, video) => {
  let functions = []
  if (!video) {
    console.log("remove video config...")
    // 删除所有video相关的配置操作
    // await deleteConfig(credentials, domainName, configs,["ali_remove_args", "set_hashkey_args"])
    // TODO 删除其他配置
  } else {
    // Range 回源
    if (video.Range) {
      let range = video.Range
      if (range !== "enable" && range !== "disable" && range !== "force") {
        console.log(red(`invalid video parameter for range: ${JSON.stringify(range)}`))
      } else if (range === "enable") {
        let functionArgs = [newFunctionArg("enable", "on")]
        functions.push(newFunction("range", functionArgs))
      } else if (range === "disable") {
        let functionArgs = [newFunctionArg("enable", "off")]
        functions.push(newFunction("range", functionArgs))
      } else if (range === "force") {
        let functionArgs = [newFunctionArg("enable", "force")]
        functions.push(newFunction("range", functionArgs))
      }
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("range", functionArgs))
    } // end of 'if (video.Range) '

    // 拖拽播放
    if (video.VideoSeek) {
      let enable = video.VideoSeek.Enable
      let flvSeek = video.VideoSeek.FlvSeek
      let mp4Seek = video.VideoSeek.Mp4Seek

      let functionArgs = []
      if (enable !== true && enable !== false) {
        console.log(red(`invalid video parameter for video seek : ${JSON.stringify(video.VideoSeek)}`))
      } else if (enable === true) {
        functionArgs.push(newFunctionArg("enable", "on"))
      } else if (enable === false) {
        functionArgs.push(newFunctionArg("enable", "off"))
      }

      if (flvSeek) {
        if (flvSeek.ByTime && flvSeek.ByTime === "enable") {
          functionArgs.push(newFunctionArg("flv_seek_by_time", "on"))
        } else {
          functionArgs.push(newFunctionArg("flv_seek_by_time", "off"))
        }
        if (flvSeek.Start) {
          functionArgs.push(newFunctionArg("flv_seek_start", flvSeek.Start))
        }
        if (flvSeek.End) {
          functionArgs.push(newFunctionArg("flv_seek_end", flvSeek.End))
        }
      }

      if (mp4Seek) {
        if (mp4Seek.Start) {
          functionArgs.push(newFunctionArg("mp4_seek_start", mp4Seek.Start))
        }
        if (mp4Seek.End) {
          functionArgs.push(newFunctionArg("mp4_seek_end", mp4Seek.End))
        }
      }
      functions.push(newFunction("video_seek", functionArgs))
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("video_seek", functionArgs))
    } // end of 'if (video.VideoSeek) '

    // 听视频
    if (video.VideoSplit && video.VideoSplit === "enable") {
      let functionArgs = [newFunctionArg("enable", "on")]
      functions.push(newFunction("ali_video_split", functionArgs))
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("ali_video_split", functionArgs))
    } // end of 'if (video.VideoSplit && video.VideoSplit === "enable")'

  } // end of 'if (!video)'
  return functions
}

const handleCache = async (credentials, domainName, configs, cache) => {
  let functions = []
  if (!cache) {
    // 删除所有performance相关的配置操作
    // await deleteConfig(credentials, domainName, configs,[""])
    // TODO 删除其他配置
  } else {
    // FileTTl
    if (cache.FileTTL) {
      for (const ft of cache.FileTTL) {
        functions.push(newFunction("filetype_based_ttl_set", [newFunctionArg("file_type", ft.FileType),
          newFunctionArg("weight", ft.Weight), newFunctionArg("ttl", ft.TTL)]))
      }
    } // end of 'if (cache.FileTTL)'
    // 先删除所有filettl, TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "filetype_based_ttl_set")

    // PathTTL
    if (cache.PathTTL) {
      for (const pt of cache.PathTTL) {
        functions.push(newFunction("path_based_ttl_set", [newFunctionArg("path", pt.Path),
          newFunctionArg("weight", pt.Weight), newFunctionArg("ttl", pt.TTL)]))
      }
    }
    // 先删除所有pathttl, TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "path_based_ttl_set")

    // DefaultPages
    if (cache.DefaultPages) {
      for (const dp of cache.DefaultPages) {
        functions.push(newFunction("error_page", [newFunctionArg("error_code", dp.Code), newFunctionArg("rewrite_page", dp.Page)]))
      }
    }
    // 先删除所有default pages, TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "error_page")

    // rewrite
    if (cache.Rewrite) {
      for (const rw of cache.Rewrite) {
        functions.push(newFunction("host_redirect", [newFunctionArg("flag", rw.Flag), newFunctionArg("regex", rw.Regex), newFunctionArg("replacement", rw.Replacement)]))
      }
    }
    // 先删除所有default pages, TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "host_redirect")

    // SetResponseHeader
    if (cache.SetResponseHeader) {
      for (const rh of cache.SetResponseHeader) {
        functions.push(newFunction("set_resp_header", [
          newFunctionArg("header_operation_type", rh.OperationType),
          newFunctionArg("key", rh.Key),
          newFunctionArg("value", rh.Value),
          newFunctionArg("duplicate", rh.Duplicate),
          newFunctionArg("match_all", rh.MatchAll),
          newFunctionArg("header_destination", rh.HeaderDestination),
          newFunctionArg("header_source", rh.HeaderSource),
        ]))
      }
    }
    // 先删除所有default pages, TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "set_resp_header")

  } // end of 'if (!cache)'
  return functions
}

const handleBackToOrigin = async (credentials, domainName, configs, backToOrigin) => {
  let functions = []
  if (!backToOrigin) {
    console.log("remove back to origin config...")
    // 删除所有video相关的配置操作
    // await deleteConfig(credentials, domainName, configs,["ali_remove_args", "set_hashkey_args"])
    // TODO 删除其他配置
  } else {
    // Range 回源
    if (backToOrigin.RequestHost) {
      let requestHost = backToOrigin.RequestHost
      let functionArgs = [newFunctionArg("domain_name", requestHost.Domain)]
      functions.push(newFunction("set_req_host_header", functionArgs))
    } else {
      await deleteConfig(credentials, domainName, configs, ["set_req_host_header"])
    } // end of 'if (backToOrigin.RequestHost)'

    // 回源协议
    if (backToOrigin.ForwardScheme) {
      let forwardScheme = backToOrigin.ForwardScheme
      let origin = forwardScheme.Origin
      let enable = ""
      if (forwardScheme.Enable === true) {
        enable = "on"
      } else if (forwardScheme.Enable === false) {
        enable = "off"
      }
      functions.push(newFunction("forward_scheme", [newFunctionArg("enable", enable), newFunctionArg("scheme_origin", origin)]))
    } else {
      functions.push(newFunction("forward_scheme", [newFunctionArg("enable", "off")]))
    } // end of 'if (backToOrigin.ForwardScheme)'

    // 回源协议
    if (backToOrigin.SNI) {
      let sni = backToOrigin.SNI
      functions.push(newFunction("https_origin_sni", [newFunctionArg("https_origin_sni", sni), newFunctionArg("enabled", "on")]))
    } else {
      functions.push(newFunction("https_origin_sni", [newFunctionArg("enabled", "off")]))
    } // end of 'if (backToOrigin.SNI)'

    // Timeout
    if (backToOrigin.Timeout) {
      let timeout = backToOrigin.Timeout
      functions.push(newFunction("forward_timeout", [newFunctionArg("forward_timeout", timeout)]))
    } else {
      functions.push(newFunction("forward_timeout", [newFunctionArg("forward_timeout", 30)]))
    } // end of 'if (backToOrigin.Timeout)'

    // Request Header
    if (backToOrigin.SetRequestHeader) {
      let requestHeader = backToOrigin.SetRequestHeader
      for (const rh of requestHeader) {
        functions.push(newFunction("set_req_header", [newFunctionArg("key", rh.Key),
          newFunctionArg("value", rh.Value)]))
      }
    }
    // 先删除所有request header , TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "set_req_header")


    // SetResponseHeader
    if (backToOrigin.ResponseHeader) {
      for (const rh of backToOrigin.ResponseHeader) {
        functions.push(newFunction("origin_response_header", [
          newFunctionArg("header_operation_type", rh.OperationType),
          newFunctionArg("header_name", rh.Key),
          newFunctionArg("header_value", rh.Value),
          newFunctionArg("duplicate", rh.Duplicate),
          newFunctionArg("match_all", rh.MatchAll),
          newFunctionArg("header_destination", rh.HeaderDestination),
          newFunctionArg("header_source", rh.HeaderSource),
        ]))
      }
    }
    // 先删除所有default pages, TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "origin_response_header")

    // URI rewrite
    if (backToOrigin.UrlRewrite) {
      for (const rw of backToOrigin.UrlRewrite) {
        functions.push(newFunction("back_to_origin_url_rewrite",
          [newFunctionArg("flag", rw.Flag), newFunctionArg("source_url", rw.SourceUrl), newFunctionArg("target_url", rw.TargetUrl)]))
      }
    }
    // 先删除所有default pages, TODO 如果没有任何变更，则不要删除
    await deleteConfig(credentials, domainName, configs, "back_to_origin_url_rewrite")

    // ArgumentRewrite
    if (backToOrigin.ArgumentRewrite) {
      let deleteArgs = backToOrigin.ArgumentRewrite.Delete.join(" ")
      let saveArgs = backToOrigin.ArgumentRewrite.Save.join(" ")
      let addArgs = backToOrigin.ArgumentRewrite.Add.join(" ")
      let modifyArgs = backToOrigin.ArgumentRewrite.Modify.join(" ")
      let ignoreAllArgument = "off"
      if (backToOrigin.ArgumentRewrite.IgnoreAll === "enable") {
        ignoreAllArgument = "on"
      } else if (backToOrigin.ArgumentRewrite.IgnoreAll === "disable") {
        ignoreAllArgument = "off"
      }

      functions.push(newFunction("back_to_origin_argument_rewrite",
        [
          newFunctionArg("delete_argument", deleteArgs),
          newFunctionArg("save_argument", saveArgs),
          newFunctionArg("add_argument", addArgs),
          newFunctionArg("modify_argument", modifyArgs),
          newFunctionArg("enable", "on"),
          newFunctionArg("ignore_all_argument", ignoreAllArgument)
        ]))
    } else {
      functions.push(newFunction("back_to_origin_argument_rewrite",
        [
          newFunctionArg("enable", "off"),
        ]))
    }// end of 'if (backToOrigin.ArgumentRewrite)'

  } // end of 'if (!backToOrigin)'
  return functions
}

const handleHttps = async (credentials, domainName, configs, https) => {
  let functions = []
  if (!https) {
    console.log("remove https config...")
    // 删除所有video相关的配置操作
    // await deleteConfig(credentials, domainName, configs,["ali_remove_args", "set_hashkey_args"])
    // TODO 删除其他配置
  } else {
    if (https.Certificate) {
      let certificate = https.Certificate.Certificate
      let privateKey = https.Certificate.PrivateKey
      let certType = https.Certificate.CertType
      let certName = https.Certificate.CertName
      let status = https.Certificate.Status
      let forceSet = https.Certificate.ForceSet

      let certList = await DescribeCdnCertificateList(credentials, domainName)
      // console.log(JSON.stringify(certList))
      let useExistCert = false
      for (const c of certList.CertificateListModel.CertList.Cert) {
        if (c.CertName === certName) {
          useExistCert = true
        }
      }
      if (!useExistCert) {
        // Https证书配置
        const privateKeyContent = await fs.readFile(privateKey, 'utf8')
        const certificateContent = await fs.readFile(certificate, 'utf8')
        // console.log(privateKeyContent)
        // console.log(certificateContent)
        await SetDomainServerCertificate(credentials, domainName, certType, certName, status, certificateContent, privateKeyContent, forceSet)
      } else {
        await SetDomainServerCertificate(credentials, domainName, certType, certName, status, "", "", forceSet)
      }
    } else {
      await SetDomainServerCertificate(credentials, domainName, "upload", "", "off", "", "", "on")
    } // end of 'if (https.Certificate)'

    // Http2
    if (https.Http2) {
      if (https.Http2 === "enable"){
        functions.push(newFunction("https_option", [newFunctionArg("http2", "on")]))
      } else if (https.Http2 === "disable") {
        functions.push(newFunction("https_option", [newFunctionArg("http2", "off")]))
      } else {
        console.log(red(`invalid performance parameter for https, invalid http2: ${JSON.stringify(https.Http2)}`))
      }
    } else {
      functions.push(newFunction("https_option", [newFunctionArg("http2", "off")]))
    } // end of 'if (https.Http2)'

    // TLS
    if (https.TLS) {
      // TLS 10
      let tls = https.TLS
      let functionArgs = []
      if (tls.Tls10) {
        if (tls.Tls10 !== "enable" && tls.Tls10 !== "disable") {
          console.log(red(`invalid performance parameter for https, invalid tls10: ${JSON.stringify(tls.TLS)}`))
        } else if (tls.Tls10 === "enable") {
          functionArgs.push(newFunctionArg("tls10", "on"))
        } else if (tls.Tls10 === "disable") {
          functionArgs.push(newFunctionArg("tls10", "off"))
        }
      } else {
        functionArgs.push(newFunctionArg("tls10", "off"))
      }

      // TLS 11
      if (tls.Tls11) {
        if (tls.Tls11 !== "enable" && tls.Tls11 !== "disable") {
          console.log(red(`invalid performance parameter for https, invalid tls11: ${JSON.stringify(tls.TLS)}`))
        } else if (tls.Tls11 === "enable") {
          functionArgs.push(newFunctionArg("tls11", "on"))
        } else if (tls.Tls11 === "disable") {
          functionArgs.push(newFunctionArg("tls11", "off"))
        }
      } else {
        functionArgs.push(newFunctionArg("tls11", "off"))
      }

      // TLS 12
      if (tls.Tls12) {
        if (tls.Tls12 !== "enable" && tls.Tls12 !== "disable") {
          console.log(red(`invalid performance parameter for https, invalid tls12: ${JSON.stringify(tls.TLS)}`))
        } else if (tls.Tls12 === "enable") {
          functionArgs.push( newFunctionArg("tls12", "on"))
        } else if (tls.Tls12 === "disable") {
          functionArgs.push(newFunctionArg("tls12", "off"))
        }
      } else {
        functionArgs.push(newFunctionArg("tls12", "off"))
      }

      // TLS 13
      if (tls.Tls13) {
        if (tls.Tls13 !== "enable" && tls.Tls13 !== "disable") {
          console.log(red(`invalid performance parameter for https, invalid tls13: ${JSON.stringify(tls.TLS)}`))
        } else if (tls.Tls13 === "enable") {
          functionArgs.push(newFunctionArg("tls13", "on"))
        } else if (tls.Tls13 === "disable") {
          functionArgs.push( newFunctionArg("tls13", "off"))
        }
      } else {
        functionArgs.push(newFunctionArg("tls13", "off"))
      }
      functions.push(newFunction("https_tls_version", functionArgs))
    } else {
      // TODO remove all configs
    }

    // HSTS
    if (https.HSTS) {
      let enable = https.HSTS.Enable
      let MaxAge = https.HSTS.MaxAge * 24 * 60 * 60
      let IncludeSubdomains = https.HSTS.IncomingMessage
      if (IncludeSubdomains) {
        if (IncludeSubdomains !== "enable" && IncludeSubdomains !== "disable") {
          console.log(red(`invalid performance parameter for https, invalid hsts: ${JSON.stringify(https.HSTS)}`))
        } else if (IncludeSubdomains === "enable") {
          IncludeSubdomains = "on"
        } else {
          IncludeSubdomains = "off"
        }
      } else {
        IncludeSubdomains = "off"
      }

      if (enable !== true && enable !== false) {
        console.log(red(`invalid performance parameter for https, invalid hsts: ${JSON.stringify(https.HSTS)}`))
      } else if (enable === true) {
        functions.push(newFunction("HSTS", [
          newFunctionArg("enabled", "on"),
          newFunctionArg("https_hsts_max_age", String(MaxAge)),
          newFunctionArg("https_hsts_include_subdomains", IncludeSubdomains),
        ]))
        console.log(MaxAge)
      } else {
        functions.push(newFunction("HSTS", [
          newFunctionArg("enabled", "off"),
          newFunctionArg("https_hsts_max_age", MaxAge),
          newFunctionArg("https_hsts_include_subdomains", IncludeSubdomains),
        ]))
      }
    } else {
      functions.push(newFunction("HSTS", [
        newFunctionArg("enabled", "off"),
        newFunctionArg("https_hsts_max_age", String(MaxAge)),
        newFunctionArg("https_hsts_include_subdomains", IncludeSubdomains),
      ]))
    }
  }
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
