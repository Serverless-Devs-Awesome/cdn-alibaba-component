'use strict'

const Pop = require('@alicloud/pop-core')

const getCDNClient = async (credentials) => {
  return await getPopClient(credentials, 'https://cdn.aliyuncs.com', '2018-05-10')
}

const getDNSClient = async (credentials) => {
  return await getPopClient(credentials, 'https://alidns.aliyuncs.com', '2015-01-09')
}

const getPopClient = async (credentials, endpoint, apiVersion) => {
  const pop = new Pop({
    endpoint: endpoint,
    apiVersion: apiVersion,
    accessKeyId: credentials.AccessKeyID,
    accessKeySecret: credentials.AccessKeySecret,
    opts: {
      timeout: 10 * 1000
    }
  })

  const realRequest = pop.request.bind(pop)
  pop.request = async (action, params, options) => {
    try {
      return await realRequest(action, params, options)
    } catch (ex) {
      await throwProcessedPopPermissionError(ex, action)
      throw ex
    }
  }

  return pop
}

async function throwProcessedPopPermissionError (ex, action) {
  if (!ex.code || !ex.url || (ex.code !== 'NoPermission' && ex.code !== 'Forbidden.RAM' && !ex.code.includes('Forbbiden'))) { // NAS 返回的权限错误码是 Forbbiden.ram
    throw ex
  }
  const productRegex = new RegExp(/https?:\/\/([a-zA-Z]*).(.*)aliyuncs.com/)
  const productRegexRes = productRegex.exec(ex.url)
  if (!productRegexRes) {
    throw ex
  }
  const product = productRegexRes[1]
  action = `${product}:${action}`
  let resource = '*'
  if (ex.data && ex.data.Message) {
    const regex = new RegExp(/Resource: (.*) Action: (.*)/)
    const res = regex.exec(ex.data.Message)
    if (res) {
      resource = res[1]
      action = res[2]
    }
  }
  const policyName = generatePolicyName(action)
  printPermissionTip(policyName, action, resource)
  throw ex
}

module.exports = {
  getCDNClient,
  getDNSClient
}
