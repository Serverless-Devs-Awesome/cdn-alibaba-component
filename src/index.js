'use strict'

const { Component } = require('@serverless-devs/s-core')

const { getCDNClient, getDNSClient} = require('./utils/client')

class CDNComponent extends Component {
  // 解析入参
  handlerInputs (inputs) {
    const properties = inputs.Properties || {}
    const credentials = inputs.Credentials || {}

  }
  // 部署操作
  async deploy(inputs) {
    console.log('start deploy cdn config...')
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
    console.log('start remove cdn config...')
    console.log('remove cdn config succeed')
  }
  // 刷新操作
  async refresh(inputs) {
    console.log('start refresh cdn config...')
    console.log('refresh cdn config succeed')
  }
  // 预热操作
  async preload(inputs) {
    console.log('start preload cdn config')
    console.log('preload cdn config succeed')
  }
}

module.exports = CDNComponent