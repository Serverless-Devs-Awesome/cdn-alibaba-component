'use strict'

const { Component } = require('@serverless-devs/s-core')

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
    // const DomainName = CDNDomain.DomainName ? CDNDomain.DomainName: {}
    // const Source = CDNDomain.Source ? CDNDomain.Source: {}
    // const Scope = CDNDomain.Scope ? CDNDomain.Scope: ''

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
    console.log('cdn config deploying...')
    let client = await getCDNClient(inputs.Credentials)
    let params = {
      "scope":"domestic",
      "cdnType":"web",
      "domainName":"prettyzxx.com",
      "sources":"[{\"type\":\"fc_domain\",\"content\":\"31359370-1314839067006888.test.functioncompute.com\",\"port\":80}]"
    }

    let requestOption = {
      method: 'POST'
    };

    client.request('AddCdnDomain', params, requestOption).then((result) => {
      console.log(JSON.stringify(result));
    }, (ex) => {
      console.log(ex);
    })

    console.log('deploy cdn config succeed')
  }
  // 移除操作
  async remove(inputs) {
    console.log('cdn config removing...')
    console.log('remove cdn config succeed')
  }
  // 刷新操作
  async refresh(inputs) {
    console.log('cdn config refreshing')
    console.log('refresh cdn config succeed')
  }
  // 预热操作
  async preload(inputs) {
    console.log('cdn config preloading')
    console.log('preload cdn config succeed')
  }
  async stop(inputs) {
    console.log('cdn config stopping')
    console.log('stop cdn config succeed')
  }
  async start(inputs) {
    console.log('cdn config starting')
    console.log('start cdn config succeed')
  }
  async status(inputs) {
    console.log('cdn config starting')
    const {
      credentials,
      state,
      args,
      tags
    } = this.handlerInputs(inputs)
    console.log(tags)
    console.log('start cdn config succeed')
  }
}

module.exports = CDNComponent