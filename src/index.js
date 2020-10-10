'use strict'

const { Component } = require('@serverless-devs/s-core')
const { green, yellow, blue, red} = require('colors')

const { getCDNClient, getDNSClient} = require('./utils/client')

class CDNComponent extends Component {
  // 解析入参
  handlerInputs (inputs) {
    const properties = inputs.Properties || {}
    const credentials = inputs.Credentials || {}
    const state = inputs.State || {}
    const args = this.args(inputs.Args)

    const CDNDomain = properties.CDNDomain || {}
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

    return {
      credentials,
      state,
      args,
      CDNDomain,
      tags,
      ipv6,
      others,
      force,
      accessControl,
      performance,
      video,
      backToOrigin,
      cache,
      https
    }
  }
  // 部署操作
  // 1.1 首先添加域名
  // 1.2 然后对域名进行配置
  async deploy(inputs) {
    console.log(blue('cdn config deploying...'))
    let client = await getCDNClient(inputs.Credentials)
    let params = {
      "scope":"domestic",
      "cdnType":"web",
      "domainName":"prettyzxx.com",
      "sources":"[{\"type\":\"fc_domain\",\"content\":\"31359370-1314839067006888.test.functioncompute.com\",\"port\":80}]"
    }

    let requestOption = {
      method: 'POST'
    }

    client.request('AddCdnDomain', params, requestOption).then((result) => {
      console.log(JSON.stringify(result))
    }, (ex) => {
      console.log(ex)
    })

    console.log(blue('deploy cdn config succeed'))
  }
  // 移除操作
  async remove(inputs) {
    console.log(blue('cdn config removing...'))
    console.log(blue('remove cdn config succeed'))
  }
  // 刷新操作
  async refresh(inputs) {
    console.log(blue('cdn config refreshing'))
    console.log(blue('refresh cdn config succeed'))
  }
  // 预热操作
  async preload(inputs) {
    console.log(blue('cdn config preloading'))
    console.log(blue('preload cdn config succeed'))
  }
  async stop(inputs) {
    console.log(blue('cdn config stopping'))
    const {
      CDNDomain
    } = this.handlerInputs(inputs)
    let client = await getCDNClient(inputs.Credentials)
    let params = {
      "domainName":CDNDomain.DomainName,
    }

    let requestOption = {
      method: 'POST'
    }

    await client.request('StopCdnDomain', params, requestOption).then((result) => {
      console.log(red('domain ' + CDNDomain.DomainName + ' stopped'))
    }, (ex) => {
      console.log(ex)
    })
    console.log(blue('stop cdn config succeed'))
  }
  async start(inputs) {
    console.log(blue('cdn config starting'))
    const {
      CDNDomain
    } = this.handlerInputs(inputs)
    let client = await getCDNClient(inputs.Credentials)
    let params = {
      "domainName":CDNDomain.DomainName,
    }

    let requestOption = {
      method: 'POST'
    }

    await client.request('StartCdnDomain', params, requestOption).then((result) => {
      console.log(green('domain ' + CDNDomain.DomainName + ' started'))
    }, (ex) => {
      console.log(ex)
    })
    console.log(blue('start cdn config succeed'))
  }

  async status(inputs) {
    console.log(blue('get cdn domain status...'))
    const {
      CDNDomain
    } = this.handlerInputs(inputs)
    let client = await getCDNClient(inputs.Credentials)
    let params = {
      "domainName":CDNDomain.DomainName,
    }

    let requestOption = {
      method: 'GET'
    }

    await client.request('DescribeCdnDomainDetail', params, requestOption).then((result) => {
      console.log(green('Description: ' + result.GetDomainDetailModel.Description))
      console.log(green('SourceInfo: '))
      console.log(green('  Type: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Type))
      console.log(green('  Content: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Content))
      console.log(green('  Priority: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Priority))
      console.log(green('  Port: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Port))
      console.log(green('  Enabled: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Enabled))
      console.log(green('  Weight: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Weight))
      // console.log(green('ResourceGroupId: ' + result.GetDomainDetailModel.ResourceGroupId))
      console.log(green('Scope: ' + result.GetDomainDetailModel.Scope))
      console.log(green('DomainName: ' + result.GetDomainDetailModel.DomainName))
      // console.log(green('GmtModified: ' + result.GetDomainDetailModel.GmtModified))
      // console.log(green('GmtCreate: ' + result.GetDomainDetailModel.GmtCreated))
      console.log(green('CdnType: ' + result.GetDomainDetailModel.CdnType))
      console.log(green('Cname: ' + result.GetDomainDetailModel.Cname))
      console.log(green('DomainStatus: ' + result.GetDomainDetailModel.DomainStatus))
    }, (ex) => {
      console.log(ex)
    })

    console.log(blue('get cdn domain status succeed'))
  }
}

module.exports = CDNComponent