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
  let deleteConfigs = []

  // ipv6
  let ipv6Args = await handleIpv6(credentials, domainName, configs, ipv6)
  if (ipv6Args.functions) {
    functions.push(ipv6Args.functions)
  }

  if(ipv6Args.deleteConfigs) {
    deleteConfigs = deleteConfigs.concat(ipv6Args.deleteConfigs)
  }

  // other
  let otherArgs = await handleOthers(credentials, domainName, configs, others)
  if (isParamsExist(otherArgs.functions)) {
    functions.push(otherArgs.functions)
  }
  if (isParamsExist(otherArgs.deleteConfigs)){
    deleteConfigs = deleteConfigs.concat(otherArgs.deleteConfigs)
  }

  // http/https

  // access control
  let accessControlArgs = await handleAccessControl(credentials, domainName, configs, accessControl)
  if (isParamsExist(accessControlArgs.functions)) {
    // console.log(JSON.stringify(accessControlArgs))
    functions = functions.concat(accessControlArgs.functions)
  }
  if (isParamsExist(accessControlArgs.deleteConfigs)) {
    deleteConfigs = deleteConfigs.concat(accessControlArgs.deleteConfigs)
  }

  // performance
  let performanceArgs = await handlePerformance(credentials, domainName, configs, performance)
  if (isParamsExist(performanceArgs.functions)) {
    // console.log(JSON.stringify(performanceArgs))
    functions = functions.concat(performanceArgs.functions)
  }

  if (isParamsExist(performanceArgs.deleteConfigs)) {
    deleteConfigs = deleteConfigs.concat(performanceArgs.deleteConfigs)
  }

  // video
  let videoArgs = await handleVideo(credentials, domainName, configs, video)
  if (isParamsExist(videoArgs.functions)) {
    // console.log(JSON.stringify(videoArgs))
    functions = functions.concat(videoArgs.functions)
  }
  if (isParamsExist(videoArgs.deleteConfigs)) {
    deleteConfigs = deleteConfigs.concat(videoArgs.deleteConfigs)
  }

  // back to origin
  let backToOrigionArgs = await handleBackToOrigin(credentials, domainName, configs, backToOrigin)
  if (isParamsExist(backToOrigionArgs.functions)) {
    // console.log(JSON.stringify(cacheArgs))
    functions = functions.concat(backToOrigionArgs.functions)
  }

  if (isParamsExist(backToOrigionArgs.deleteConfigs)) {
    deleteConfigs = deleteConfigs.concat(backToOrigionArgs.deleteConfigs)
  }

  // cache
  let cacheArgs = await handleCache(credentials, domainName, configs, cache)
  if (isParamsExist(cacheArgs.functions)) {
    // console.log(JSON.stringify(cacheArgs))
    functions = functions.concat(cacheArgs.functions)
  }
  if (isParamsExist(cacheArgs.deleteConfigs)) {
    deleteConfigs = deleteConfigs.concat(cacheArgs.deleteConfigs)
  }

  // https
  let httpsArgs = await handleHttps(credentials, domainName, configs, https)
  if (isParamsExist(httpsArgs.functions)){
    // console.log(JSON.stringify(httpsArgs))
    functions = functions.concat(httpsArgs.functions)
  }
  if (isParamsExist(httpsArgs.deleteConfigs)) {
    deleteConfigs = deleteConfigs.concat(httpsArgs.deleteConfigs)
  }

  if (deleteConfigs.length !== 0) {
    await deleteConfig(credentials, domainName, configs, deleteConfigs)
  }

  // console.log(JSON.stringify(functions))
  if (functions.length !== 0) {
    // console.log(JSON.stringify(functions))
    await SetCdnDomainConfig(credentials, domainName, JSON.stringify(functions))
  }
}

// TODO 当前region只支持all(*)配置
const handleIpv6 = async (credentials, domainName, configs, ipv6) => {
  let functionArgs = [newFunctionArg("region", "*")]

  let enable = ipv6.Enable
  if (validateBoolParam(enable)) {
    if (enable === true) {
      functionArgs.push(newFunctionArg("switch", "on" ))
    } else {
      functionArgs.push(newFunctionArg("switch", "off"))
    }
  } else {
    console.log(red(`invalid ipv6 parameter: ${JSON.stringify(ipv6)}`))
  }
  return {
    "functions" : newFunction("ipv6", functionArgs)
  }
}

const handleOthers = async (credentials, domainName, configs, others) => {
  let greenManager = others.GreenManager
  if (validateEnabledParam(greenManager)) {
    if (greenManager === "enable") {
      let functionArgs = [newFunctionArg("enable", "on")]
      return {
        "functions": newFunction("green_manager", functionArgs)
      }
    } else {
      return {
        "deleteConfigs":["green_manager"]
      }
    }
  } else {
    console.log(red(`invalid green manager parameter: ${JSON.stringify(others)}`))
  }
}

const handleAccessControl = async (credentials, domainName, configs, accessControl) => {
  let functions = []
  let deleteConfigs = []
  // Referer
  if (isParamsExist(accessControl.Referer)) {
    const whiteList = accessControl.Referer.White
    const blackList = accessControl.Referer.Black
    if (isParamsExist(whiteList) && !isParamsExist(blackList)) {
      // TODO 在页面上的allow_empty是不可以配置的，没必要写到template中。
      let functionArgs = [newFunctionArg("allow_empty", "off"), newFunctionArg("refer_domain_allow_list", whiteList.List.join(","))]
      functions.push(newFunction("referer_white_list_set", functionArgs))
      deleteConfigs.push("referer_black_list_set")
    } else if (!isParamsExist(whiteList) && isParamsExist(blackList)) {
      let functionArgs = [newFunctionArg("allow_empty", "off"), newFunctionArg("refer_domain_deny_list", blackList.List.join(","))]
      functions.push(newFunction("referer_black_list_set", functionArgs))
      deleteConfigs.push("referer_white_list_set")
    } else {
      console.log(red(`invalid access control parameter for referer: ${JSON.stringify(accessControl.Referer)}`))
    }
  } else {
    deleteConfigs.push("referer_white_list_set")
    deleteConfigs.push("referer_black_list_set")
  } // end of 'if (accessControl.Referer) '

  // ip
  if (isParamsExist(accessControl.Ip)) {
    const whiteList = accessControl.Ip.WhiteList
    const blackList = accessControl.Ip.BlackList
    if (whiteList && !blackList) {
      let functionArgs = [newFunctionArg("ip_list", whiteList.join(","))]
      functions.push(newFunction("ip_allow_list_set", functionArgs))
      deleteConfigs.push("ip_black_list_set")
    } else if (!whiteList && blackList) {
      let functionArgs = [newFunctionArg("ip_list", blackList.join(","))]
      functions.push(newFunction("ip_black_list_set", functionArgs))
      deleteConfigs.push("ip_allow_list_set")
    } else {
      console.log(red(`invalid access control parameter for ip: ${JSON.stringify(accessControl.Ip)}`))
    }
  } else {
    deleteConfigs.push("ip_allow_list_set")
    deleteConfigs.push("ip_black_list_set")
  } // end of 'if (accessControl.Ip)'

  // user agent
  if (isParamsExist(accessControl.UserAgent)) {
    const whiteList = accessControl.UserAgent.WhiteList
    const blackList = accessControl.UserAgent.BlackList
    if (whiteList && !blackList) {
      let functionArgs = [newFunctionArg("type", "white"), newFunctionArg("ua", whiteList.join("|"))]
      functions.push(newFunction("ali_ua", functionArgs))
      deleteConfigs.push("ali_ua")
    } else if (!whiteList && blackList) {
      let functionArgs = [newFunctionArg("type", "black"), newFunctionArg("ua", blackList.join("|"))]
      functions.push(newFunction("ali_ua", functionArgs))
      deleteConfigs.push("ali_ua")
    } else {
      console.log(red(`invalid access control parameter for user agent: ${JSON.stringify(accessControl.UserAgent)}`))
    }
  } else {
    deleteConfigs.push("ali_ua")
  } // end of 'if (accessControl.UserAgent)'

  // Auth
  if (isParamsExist(accessControl.Auth)) {
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

  return {
    "functions":functions,
    "deleteConfigs": deleteConfigs
  }
}

const handlePerformance = async (credentials, domainName, configs, performance) => {
  let functions = []
  let deleteConfigs = []
  // Tesla 页面优化
  let tesla = performance.Tesla
  if (validateEnabledParam(tesla)) {
    if (tesla === "enable") {
      let functionArgs = [newFunctionArg("enable", "on")]
      functions.push(newFunction("tesla", functionArgs))
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("tesla", functionArgs))
    }
  } else {
    console.log(red(`invalid performance parameter for tesla: ${JSON.stringify(tesla)}`))
  }

  // Gzip 智能压缩
  let gzip = performance.Gzip
  if (validateEnabledParam(gzip)) {
    if (gzip === "enable") {
      let functionArgs = [newFunctionArg("enable", "on")]
      functions.push(newFunction("gzip", functionArgs))
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("gzip", functionArgs))
    }
  } else {
    console.log(red(`invalid performance parameter for Gzip: ${JSON.stringify(gzip)}`))
  }

  // Brotli 压缩
  let brotli = performance.Brotli
  if (validateEnabledParam(brotli)) {
    if (brotli === "enable") {
      let functionArgs = [newFunctionArg("enable", "on"), newFunctionArg("brotli_level", "1")]
      functions.push(newFunction("brotli", functionArgs))
    } else {
      let functionArgs = [newFunctionArg("enable", "off"), newFunctionArg("brotli_level", "1")]
      functions.push(newFunction("brotli", functionArgs))
    }
  } else {
    console.log(red(`invalid performance parameter for Brotli: ${JSON.stringify(brotli)}`))
  }
  // 保留参数
  let hashKeyArgs = performance.HashkeyArgs
  if (isParamsExist(hashKeyArgs)) {
    let keepOssArgs = hashKeyArgs.KeepOSSArgs
    if (validateEnabledParam(keepOssArgs)) {
      if (keepOssArgs === "enable") {
        keepOssArgs = "on"
      } else {
        keepOssArgs = "off"
      }
    } else {
      console.log(red(`invalid performance parameter for HashkeyArgs, invalid keepOssArgs, set keep oss args to disable : ${JSON.stringify(performance.HashkeyArgs)}`))
    }

    if (isParamsExist(hashKeyArgs.Enable)) {
      if (validateBoolParam(hashKeyArgs.Enable)) {
        if (hashKeyArgs.Enable === true) {
          let functionArgs = [newFunctionArg("hashkey_args", hashKeyArgs.Args.join(",")), newFunctionArg("keep_oss_args", keepOssArgs), newFunctionArg("disable", "on")]
          functions.push(newFunction("set_hashkey_args", functionArgs))
        } else {
          deleteConfigs.push("set_hashkey_args")
        }
      } else {
        console.log(red(`invalid performance parameter for HashkeyArgs, invalid enable: ${JSON.stringify(performance.HashkeyArgs)}`))
      }
    }
  } else {
    deleteConfigs.push("set_hashkey_args")
  }

  // 过滤参数
  let removeArgs = performance.RemoveArgs
  if (isParamsExist(removeArgs)) {
    let keepOssArgs = removeArgs.KeepOSSArgs

    if (validateEnabledParam(keepOssArgs)) {
      if (keepOssArgs === "enable") {
        keepOssArgs = "on"
      } else {
        keepOssArgs = "off"
      }
    } else {
      console.log(red(`invalid performance parameter for RemoveArgs, invalid keepOssArgs, set keep oss args to disable : ${JSON.stringify(performance.RemoveArgs)}`))
    }

    if (validateBoolParam(removeArgs.Enable)) {
      if (removeArgs.Enable === true) {
        let functionArgs = [newFunctionArg("ali_remove_args", removeArgs.Args.join(" ")), newFunctionArg("keep_oss_args", keepOssArgs)]
        functions.push(newFunction("ali_remove_args", functionArgs))
      } else {
        deleteConfigs.push("ali_remove_args")
      }
    } else {
      console.log(red(`invalid performance parameter for RemoveArgs, invalid enable: ${JSON.stringify(performance.RemoveArgs)}`))
    }
  } else {
    deleteConfigs.push("ali_remove_args")
  }

  return {
    "functions":functions,
    "deleteConfigs":deleteConfigs
  }
}

const handleVideo = async (credentials, domainName, configs, video) => {
  let functions = []
  // Range 回源
  if (isParamsExist(video.Range)) {
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
  if (isParamsExist(video.VideoSeek)) {
    let enable = video.VideoSeek.Enable
    let flvSeek = video.VideoSeek.FlvSeek
    let mp4Seek = video.VideoSeek.Mp4Seek

    let functionArgs = []
    if (validateBoolParam(enable)) {
      if (enable === true) {
        functionArgs.push(newFunctionArg("enable", "on"))
      } else {
        functionArgs.push(newFunctionArg("enable", "off"))
      }
    } else {
      console.log(red(`invalid video parameter for video seek : ${JSON.stringify(video.VideoSeek)}`))
    }

    if (isParamsExist(flvSeek)) {
      if (validateEnabledParam(flvSeek.ByTime)) {
        if (flvSeek.ByTime && flvSeek.ByTime === "enable") {
          functionArgs.push(newFunctionArg("flv_seek_by_time", "on"))
        } else {
          functionArgs.push(newFunctionArg("flv_seek_by_time", "off"))
        }
      } else {
        console.log(red(`invalid video parameter for flv video seek : ${JSON.stringify(video.VideoSeek)}`))
      }

      if (isParamsExist(flvSeek.Start)) {
        functionArgs.push(newFunctionArg("flv_seek_start", flvSeek.Start))
      }
      if (isParamsExist(flvSeek.End)) {
        functionArgs.push(newFunctionArg("flv_seek_end", flvSeek.End))
      }
    }

    if (isParamsExist(mp4Seek)) {
      if (isParamsExist(mp4Seek.Start)) {
        functionArgs.push(newFunctionArg("mp4_seek_start", mp4Seek.Start))
      }
      if (isParamsExist(mp4Seek.End)) {
        functionArgs.push(newFunctionArg("mp4_seek_end", mp4Seek.End))
      }
    }
    functions.push(newFunction("video_seek", functionArgs))
  } else {
    let functionArgs = [newFunctionArg("enable", "off")]
    functions.push(newFunction("video_seek", functionArgs))
  } // end of 'if (video.VideoSeek) '

  // 听视频
  let videoSplit = video.VideoSplit
  if (validateEnabledParam(videoSplit)) {
    if (videoSplit === "enable") {
      let functionArgs = [newFunctionArg("enable", "on")]
      functions.push(newFunction("ali_video_split", functionArgs))
    } else {
      let functionArgs = [newFunctionArg("enable", "off")]
      functions.push(newFunction("ali_video_split", functionArgs))
    } // end of 'if (video.VideoSplit && video.VideoSplit === "enable")'
  } else {
    console.log(red(`invalid video parameter for video split: ${JSON.stringify(video.VideoSplit)}`))
  }
  return {
    "functions": functions
  }
}

const handleCache = async (credentials, domainName, configs, cache) => {
  let functions = []
  let deleteConfigs = []
  // FileTTl
  if (isParamsExist(cache.FileTTL)) {
    for (const ft of cache.FileTTL) {
      functions.push(newFunction("filetype_based_ttl_set", [newFunctionArg("file_type", ft.FileType),
        newFunctionArg("weight", ft.Weight), newFunctionArg("ttl", ft.TTL)]))
    }
  } // end of 'if (cache.FileTTL)'
  deleteConfigs.push("filetype_based_ttl_set")

  // PathTTL
  if (isParamsExist(cache.PathTTL)) {
    for (const pt of cache.PathTTL) {
      functions.push(newFunction("path_based_ttl_set", [newFunctionArg("path", pt.Path),
        newFunctionArg("weight", pt.Weight), newFunctionArg("ttl", pt.TTL)]))
    }
  }
  deleteConfigs.push("path_based_ttl_set")

  // DefaultPages
  if (isParamsExist(cache.DefaultPages)) {
    for (const dp of cache.DefaultPages) {
      functions.push(newFunction("error_page", [newFunctionArg("error_code", dp.Code), newFunctionArg("rewrite_page", dp.Page)]))
    }
  }
  deleteConfigs.push("error_page")

  // rewrite
  if (isParamsExist(cache.Rewrite)) {
    for (const rw of cache.Rewrite) {
      functions.push(newFunction("host_redirect", [newFunctionArg("flag", rw.Flag), newFunctionArg("regex", rw.Regex), newFunctionArg("replacement", rw.Replacement)]))
    }
  }
  deleteConfigs.push( "host_redirect")

  // SetResponseHeader
  if (isParamsExist(cache.SetResponseHeader)) {
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
  deleteConfigs.push("set_resp_header")
  return {
    "functions":functions,
    "deleteConfigs":deleteConfigs
  }
}

const handleBackToOrigin = async (credentials, domainName, configs, backToOrigin) => {
  let functions = []
  let deleteConfigs = []
  // Range 回源
  if (isParamsExist(backToOrigin.RequestHost)) {
    let requestHost = backToOrigin.RequestHost
    let functionArgs = [newFunctionArg("domain_name", requestHost.Domain)]
    functions.push(newFunction("set_req_host_header", functionArgs))
  } else {
    deleteConfigs.push("set_req_host_header")
  } // end of 'if (backToOrigin.RequestHost)'

  // 回源协议
  if (isParamsExist(backToOrigin.ForwardScheme)) {
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
  if (isParamsExist(backToOrigin.SNI)) {
    let sni = backToOrigin.SNI
    functions.push(newFunction("https_origin_sni", [newFunctionArg("https_origin_sni", sni), newFunctionArg("enabled", "on")]))
  } else {
    functions.push(newFunction("https_origin_sni", [newFunctionArg("enabled", "off")]))
  } // end of 'if (backToOrigin.SNI)'

  // Timeout
  if (isParamsExist(backToOrigin.Timeout)) {
    let timeout = backToOrigin.Timeout
    functions.push(newFunction("forward_timeout", [newFunctionArg("forward_timeout", timeout)]))
  } else {
    functions.push(newFunction("forward_timeout", [newFunctionArg("forward_timeout", 30)]))
  } // end of 'if (backToOrigin.Timeout)'

  // Request Header
  if (isParamsExist(backToOrigin.SetRequestHeader)) {
    let requestHeader = backToOrigin.SetRequestHeader
    for (const rh of requestHeader) {
      functions.push(newFunction("set_req_header", [newFunctionArg("key", rh.Key),
        newFunctionArg("value", rh.Value)]))
    }
  }
  // 先删除所有request header , TODO 如果没有任何变更，则不要删除
  deleteConfigs.push("set_req_header")

  // SetResponseHeader
  if (isParamsExist(backToOrigin.ResponseHeader)) {
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
  deleteConfigs.push("origin_response_header")

  // URI rewrite
  if (isParamsExist(backToOrigin.UrlRewrite)) {
    for (const rw of backToOrigin.UrlRewrite) {
      functions.push(newFunction("back_to_origin_url_rewrite",
        [newFunctionArg("flag", rw.Flag), newFunctionArg("source_url", rw.SourceUrl), newFunctionArg("target_url", rw.TargetUrl)]))
    }
  }
  // 先删除所有default pages, TODO 如果没有任何变更，则不要删除
  deleteConfigs.push( "back_to_origin_url_rewrite")

  // ArgumentRewrite
  if (isParamsExist(backToOrigin.ArgumentRewrite)) {
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
  return {
    "functions":functions,
    "deleteConfigs":deleteConfigs
  }
}

const handleHttps = async (credentials, domainName, configs, https) => {
  let functions = []
  let deleteConfigs = []
  if (isParamsExist(https.Certificate)) {
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
  let http2 = https.Http2
  if (validateEnabledParam(http2)) {
    if (http2 === "enable"){
      functions.push(newFunction("https_option", [newFunctionArg("http2", "on")]))
    } else {
      functions.push(newFunction("https_option", [newFunctionArg("http2", "off")]))
    }
  } else {
    console.log(red(`invalid performance parameter for https, invalid http2: ${JSON.stringify(https.Http2)}`))
  }

  // force
  let force = https.Force
  if (isParamsExist(force)) {
    if (force === "http"){
      functions.push(newFunction("http_force", [newFunctionArg("enable", "on")]))
    } else if (force === "https") {
      functions.push(newFunction("https_force", [newFunctionArg("enable", "on")]))
    } else if (force === "default") {
      // do nothing
    } else {
      console.log(red(`invalid performance parameter for https, invalid http2: ${JSON.stringify(https.Force)}`))
    }
  } // end of 'if (https.Http2)'
  deleteConfigs.push("http_force")
  deleteConfigs.push("https_force")

  // TLS

  let tls = https.TLS
  if (isParamsExist(tls)) {
    // TLS 10
    let functionArgs = []
    if (validateEnabledParam(tls.Tls10)) {
      if (tls.Tls10 === "enable") {
        functionArgs.push(newFunctionArg("tls10", "on"))
      } else {
        functionArgs.push(newFunctionArg("tls10", "off"))
      }
    } else {
      console.log(red(`invalid performance parameter for https, invalid tls10: ${JSON.stringify(tls.TLS)}`))
    }

// TLS 11
  if (validateEnabledParam(tls.Tls11)) {
    if (tls.Tls11 === "enable") {
      functionArgs.push(newFunctionArg("tls11", "on"))
    } else {
      functionArgs.push(newFunctionArg("tls11", "off"))
    }
  } else {
    console.log(red(`invalid performance parameter for https, invalid tls11: ${JSON.stringify(tls.TLS)}`))
  }

  // TLS 12
  if (validateEnabledParam(tls.Tls12)) {
    if (tls.Tls12 === "enable") {
      functionArgs.push( newFunctionArg("tls12", "on"))
    } else {
      functionArgs.push(newFunctionArg("tls12", "off"))
    }
  } else {
    console.log(red(`invalid performance parameter for https, invalid tls12: ${JSON.stringify(tls.TLS)}`))
  }

  // TLS 13
    if (validateEnabledParam(tls.Tls13)) {
      if (tls.Tls13 === "enable") {
        functionArgs.push(newFunctionArg("tls13", "on"))
      } else {
        functionArgs.push( newFunctionArg("tls13", "off"))
      }
    } else {
      console.log(red(`invalid performance parameter for https, invalid tls13: ${JSON.stringify(tls.TLS)}`))
    }

    if (functionArgs.length > 0) {
      functions.push(newFunction("https_tls_version", functionArgs))
    }
  }

  // HSTS
  if (isParamsExist(https.HSTS)) {
    let enable = https.HSTS.Enable
    let MaxAge = https.HSTS.MaxAge * 24 * 60 * 60
    let IncludeSubdomains = https.HSTS.IncludeSubdomains
    if (validateEnabledParam(IncludeSubdomains)) {
      if (IncludeSubdomains === "enable") {
        IncludeSubdomains = "on"
      } else {
        IncludeSubdomains = "off"
      }
    } else {
      console.log(red(`invalid performance parameter for https, invalid hsts: ${JSON.stringify(https.HSTS)}`))
    }

    if (validateBoolParam(enable)) {
      if (enable === true) {
        functions.push(newFunction("HSTS", [
          newFunctionArg("enabled", "on"),
          newFunctionArg("https_hsts_max_age", String(MaxAge)),
          newFunctionArg("https_hsts_include_subdomains", IncludeSubdomains),
        ]))
      } else {
        functions.push(newFunction("HSTS", [
          newFunctionArg("enabled", "off"),
          newFunctionArg("https_hsts_max_age", MaxAge),
          newFunctionArg("https_hsts_include_subdomains", IncludeSubdomains),
        ]))
      }
    } else {
      console.log(red(`invalid performance parameter for https, invalid hsts: ${JSON.stringify(https.HSTS)}`))
    }
  } else {
    functions.push(newFunction("HSTS", [
      newFunctionArg("enabled", "off"),
      newFunctionArg("https_hsts_max_age", String(0)),
      newFunctionArg("https_hsts_include_subdomains", "off"),
    ]))
  }
  return {
    "functions":functions,
    "deleteConfigs":deleteConfigs
  }
}


// TODO delete config after all config
const deleteConfig = async (credentials, domainName, configs, configNameList) => {
  for (const c of configs.DomainConfigs.DomainConfig) {
    if (configNameList.indexOf(c.FunctionName) !== -1)
      await DeleteSpecificConfig(credentials, domainName, c.ConfigId)
  }
}

function isParamsExist(params) {
  return typeof(params) !== "undefined" && JSON.stringify(params) !== "{}"
}

function validateEnabledParam(params) {
  return typeof(params) === "undefined" || !params || (params === "enable" || params === "disable")
}

function validateBoolParam(params) {
  return typeof(params) === "undefined" || !params || (params === true || params === false)
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
