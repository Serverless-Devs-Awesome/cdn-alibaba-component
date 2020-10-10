'use strict'

const { Component } = require('@serverless-devs/s-core')
const { green, yellow, blue, red} = require('colors')

const { getCdnClient, getDNSClient} = require('./utils/client')

class CdnComponent extends Component {
  // 解析入参
  handlerInputs (inputs) {
    const properties = inputs.Properties || {}
    const credentials = inputs.Credentials || {}
    const state = inputs.State || {}
    const args = this.args(inputs.Args)

    const CdnDomain = properties.CdnDomain || {}
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
      CdnDomain: CdnDomain,
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
  async deploy(inputs) {
    console.log(blue('CDN config deploying...'))
    const {
      CdnDomain
    } = this.handlerInputs(inputs)
    let client = await getCdnClient(inputs.Credentials)
    let params = {
      "domainName":CdnDomain.DomainName,
      "scope":CdnDomain.Scope,
      "cdnType":CdnDomain.CdnType,
      "source": JSON.stringify(CdnDomain.Sources)
    }

    let requestOption = {
      method: 'POST'
    }

    client.request('AddCdnDomain', params, requestOption).then((result) => {
      console.log(JSON.stringify(result))
    }, (ex) => {
      console.log(ex)
    })

    console.log(blue('deploy CDN config succeed'))
  }

  // 移除操作
  async remove(inputs) {
    console.log(blue('CDN config removing...'))
    console.log(blue('remove CDN config succeed'))
  }

  // 刷新操作
  async refresh(inputs) {
    console.log(blue('CDN config refreshing'))
    console.log(blue('refresh CDN config succeed'))
  }

  // 预热操作
  async preload(inputs) {
    console.log(blue('CDN config preloading'))
    console.log(blue('preload CDN config succeed'))
  }

  // 停止域名加速
  async stop(inputs) {
    console.log(blue('CDN config stopping'))
    const {
      CdnDomain
    } = this.handlerInputs(inputs)
    let client = await getCdnClient(inputs.Credentials)
    let params = {
      "domainName":CdnDomain.DomainName,
    }

    let requestOption = {
      method: 'POST'
    }

    await client.request('StopCdnDomain', params, requestOption).then((result) => {
      console.log(red('domain ' + CdnDomain.DomainName + ' stopped'))
    }, (ex) => {
      console.log(ex)
    })
    console.log(blue('stop CDN config succeed'))
  }


  // 启用域名加速
  async start(inputs) {
    console.log(blue('CDN config starting'))
    const {
      CdnDomain
    } = this.handlerInputs(inputs)
    let client = await getCdnClient(inputs.Credentials)
    let params = {
      "domainName":CdnDomain.DomainName,
    }

    let requestOption = {
      method: 'POST'
    }

    await client.request('StartCdnDomain', params, requestOption).then((result) => {
      console.log(green('domain ' + CdnDomain.DomainName + ' started'))
    }, (ex) => {
      console.log(ex)
    })
    console.log(blue('start CDN config succeed'))
  }

  // 获取加速域名状态
  async status(inputs) {
    console.log(blue('get CDN domain status...'))
    const {
      CdnDomain
    } = this.handlerInputs(inputs)
    let client = await getCdnClient(inputs.Credentials)
    let params = {
      "domainName":CdnDomain.DomainName,
    }

    let requestOption = {
      method: 'GET'
    }

    await client.request('DescribeCdnDomainDetail', params, requestOption).then((result) => {
      console.log(green('DomainName: ' + result.GetDomainDetailModel.DomainName))
      console.log(green('DomainStatus: ' + result.GetDomainDetailModel.DomainStatus))
      console.log(green('SourceInfo: '))
      console.log(green('  Type: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Type))
      console.log(green('  Content: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Content))
      console.log(green('  Priority: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Priority))
      console.log(green('  Port: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Port))
      console.log(green('  Enabled: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Enabled))
      console.log(green('  Weight: ' + result.GetDomainDetailModel.SourceModels.SourceModel[0].Weight))
      // console.log(green('ResourceGroupId: ' + result.GetDomainDetailModel.ResourceGroupId))
      console.log(green('Description: ' + result.GetDomainDetailModel.Description))
      console.log(green('Scope: ' + result.GetDomainDetailModel.Scope))
      // console.log(green('GmtModified: ' + result.GetDomainDetailModel.GmtModified))
      // console.log(green('GmtCreate: ' + result.GetDomainDetailModel.GmtCreated))
      console.log(green('CdnType: ' + result.GetDomainDetailModel.CdnType))
      console.log(green('Cname: ' + result.GetDomainDetailModel.Cname))
    }, (ex) => {
      console.log(ex)
    })

    console.log(blue('get CDN domain status succeed'))
  }
}

module.exports = CdnComponent