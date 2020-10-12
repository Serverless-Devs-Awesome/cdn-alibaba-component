'use strict'

const { Component } = require('@serverless-devs/s-core')
const { green, yellow, blue, red} = require('colors')
const { deployImpl } = require('./command-impl/deploy')
const { statusImpl } = require('./command-impl/status')
const { removeImpl } = require('./command-impl/remove')
const { preloadImpl } = require('./command-impl/preload')
const { refreshImpl } = require('./command-impl/refresh')
const { stopImpl } = require('./command-impl/stop')
const { startImpl } = require('./command-impl/start')

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
      credentials, state, args, cdnDomain, tags, ipv6,
      others, force, accessControl, performance, video,
      backToOrigin, cache, https, refresh, preload, domainName,
    }
  }

  // TODO make sure all operation succeed
  // 部署操作
  async deploy(inputs) {
    console.log(blue('CDN config deploying...'))
    await deployImpl(this.handlerInputs(inputs))
    console.log(blue('deploy CDN config succeed'))
  }

  // 移除操作
  async remove(inputs) {
    console.log(blue('CDN config removing...'))
    await removeImpl(this.handlerInputs(inputs))
    console.log(blue('remove CDN config succeed'))
  }

  // 刷新操作
  async refresh(inputs) {
    console.log(blue('CDN config refreshing'))
    await refreshImpl(this.handlerInputs(inputs))
    console.log(blue('refresh CDN config succeed'))
  }

  // 预热操作
  async preload(inputs) {
    console.log(blue('CDN config preloading'))
    await preloadImpl(this.handlerInputs(inputs))
    console.log(blue('preload CDN config succeed'))
  }

  // 停止域名加速
  async stop(inputs) {
    console.log(blue('CDN config stopping'))
    await stopImpl(this.handlerInputs(inputs))
    console.log(blue('stop CDN config succeed'))
  }


  // 启用域名加速
  async start(inputs) {
    console.log(blue('CDN config starting'))
    await startImpl(this.handlerInputs(inputs))
    console.log(blue('start CDN config succeed'))
  }

  // 获取加速域名状态
  async status(inputs) {
    console.log(blue('get CDN domain status...'))
    await statusImpl(this.handlerInputs(inputs))
    console.log(blue('get CDN domain status succeed'))
  }
}

module.exports = CdnComponent