'use strict'

const { Component } = require('@serverless-devs/s-core')
const { green, yellow, blue, red} = require('colors')
const { getCdnClient, getDNSClient} = require('./utils/client')
const { DescribeCdnDomainDetail, StartCdnDomain, StopCdnDomain,
  AddCdnDomain, RemoveCdnDomain, RefreshCdnDomain, PreloadCdnDomain,
  DescribeUserDomains, TagResources
} = require('./services/cdn')

class CdnComponent extends Component {
  // 解析入参
  handlerInputs (inputs) {
    const properties = inputs.Properties || {}
    const credentials = inputs.Credentials || {}
    const state = inputs.State || {}
    const args = this.args(inputs.Args)

    const cdnDomain = properties.CdnDomain || {}
    const tags = properties.Tags || {}
    const ipv6 = properties.Ipv6 || {}
    const others = properties.Others || {}
    const force = properties.Force || {}

    const accessControl = properties.AccessControl || {}
    const performance = properties.Performance || {}
    const video = properties.Video || {}
    const backToOrigin = properties.BackToOrigin || {}
    const cache = properties.Cache || {}
    const https = properties.Https || {}

    const refresh = properties.Refresh || {}
    const preload = properties.Preload || {}

    const domainName = cdnDomain.DomainName || {}

    return {
      credentials,
      state,
      args,
      cdnDomain: cdnDomain,
      tags,
      ipv6,
      others,
      force,
      accessControl,
      performance,
      video,
      backToOrigin,
      cache,
      https,
      refresh,
      preload,
      domainName,
    }
  }

  // TODO make sure all operation succeed
  // 部署操作
  async deploy(inputs) {
    console.log(blue('CDN config deploying...'))
    const {
      credentials,
      cdnDomain,
      domainName,
      tags,
    } = this.handlerInputs(inputs)
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
    if (tags.length !== 0) {
      await TagResources(credentials, domainName, tags)
    }

    console.log(blue('deploy CDN config succeed'))
  }

  // 移除操作
  async remove(inputs) {
    console.log(blue('CDN config removing...'))
    const {
      credentials,
      domainName
    } = this.handlerInputs(inputs)
    let cdnDomainDetail = await DescribeCdnDomainDetail(credentials, domainName)
    let resourceGroupId = cdnDomainDetail.GetDomainDetailModel.ResourceGroupId
    await RemoveCdnDomain(credentials, domainName, resourceGroupId)

    console.log(blue('remove CDN config succeed'))
  }

  // 刷新操作
  async refresh(inputs) {
    console.log(blue('CDN config refreshing'))
    const {
      credentials,
      refresh,
      args
    } = this.handlerInputs(inputs)
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

    console.log(blue('refresh CDN config succeed'))
  }

  // 预热操作
  async preload(inputs) {
    console.log(blue('CDN config preloading'))
    const {
      credentials,
      preload,
      args,
    } = this.handlerInputs(inputs)

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

    console.log(blue('preload CDN config succeed'))
  }

  // 停止域名加速
  async stop(inputs) {
    console.log(blue('CDN config stopping'))
    const {
      credentials,
      domainName
    } = this.handlerInputs(inputs)
    await StopCdnDomain(credentials, domainName)

    console.log(red('domain ' + domainName + ' stopped'))
    console.log(blue('stop CDN config succeed'))
  }


  // 启用域名加速
  async start(inputs) {
    console.log(blue('CDN config starting'))
    const {
      credentials,
      domainName
    } = this.handlerInputs(inputs)
    await StartCdnDomain(credentials, domainName)

    console.log(green('domain ' + domainName + ' started'))
    console.log(blue('start CDN config succeed'))
  }

  // 获取加速域名状态
  async status(inputs) {
    console.log(blue('get CDN domain status...'))
    const {
      credentials,
      domainName
    } = this.handlerInputs(inputs)
    let result = await DescribeCdnDomainDetail(credentials, domainName)
    let domainNameDetail = result.GetDomainDetailModel
    let sourceModel = domainNameDetail.SourceModels.SourceModel[0]

    console.log(green('DomainName: ' + domainNameDetail.DomainName))
    console.log(green('DomainStatus: ' + domainNameDetail.DomainStatus))
    console.log(green('Scope: ' + domainNameDetail.Scope))
    console.log(green('SourceInfo: '))
    console.log(green('  Type: ' + sourceModel.Type))
    console.log(green('  Content: ' + sourceModel.Content))
    console.log(green('  Priority: ' + sourceModel.Priority))
    console.log(green('  Port: ' + sourceModel.Port))
    console.log(green('  Enabled: ' + sourceModel.Enabled))
    console.log(green('  Weight: ' + sourceModel.Weight))
    // console.log(green('ResourceGroupId: ' + domainNameDetail.ResourceGroupId))
    console.log(green('Description: ' + domainNameDetail.Description))
    // console.log(green('GmtModified: ' + domainNameDetail.GmtModified))
    // console.log(green('GmtCreate: ' + domainNameDetail.GmtCreated))
    console.log(green('CdnType: ' + domainNameDetail.CdnType))
    console.log(green('Cname: ' + domainNameDetail.Cname))
    console.log(blue('get CDN domain status succeed'))
  }
}

module.exports = CdnComponent