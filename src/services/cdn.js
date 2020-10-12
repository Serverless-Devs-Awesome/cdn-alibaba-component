'use strict'
const { green, yellow, blue, red} = require('colors')
const { getCdnClient, getDNSClient} = require('../utils/client')

// cdn related api call

const AddCdnDomain = async (credentials, cdnDomain) => {
  let client = await getCdnClient(credentials)
  let source = new Array({
    "content": cdnDomain.Sources.Content,
    "type": cdnDomain.Sources.Type,
    "priority": cdnDomain.Sources.Priority,
    "port": cdnDomain.Sources.Port,
    "weight": cdnDomain.Sources.Weight
  })

  let params = {
    "domainName": cdnDomain.DomainName,
    "scope": cdnDomain.Scope,
    "cdnType": cdnDomain.CdnType,
    "sources": JSON.stringify(source)
  }
  // console.log(params)

  let requestOption = {
    method: 'POST'
  }

  try {
    await client.request('AddCdnDomain', params, requestOption)
  } catch (ex) {
    console.log(red(`deploy cdn domain failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }
}

const RemoveCdnDomain = async (credentials, domainName, resourceGroupId) => {
  let client = await getCdnClient(credentials)
  let params = {
    "domainName":domainName,
    "resourceGroupId":resourceGroupId,
  }
  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('DeleteCdnDomain', params, requestOption)
  } catch (ex)  {
    console.log(ex)
  }
}

// TODO 根据任务查询是否成功
const PreloadCdnDomain = async (credentials, path, area) => {
  let client = await getCdnClient(credentials)
  let params = {
    "objectPath": path,
    "area": area,
  }
  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('RefreshObjectCaches', params, requestOption)
  } catch (ex)  {
    console.log(red(`preload cdn domain failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }
}

// TODO 根据任务查询是否成功
const RefreshCdnDomain = async (credentials, path, type) => {
  let client = await getCdnClient(credentials)
  let params = {
    "objectPath": path,
    "objectType": type,
  }
  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('PushObjectCache', params, requestOption)
  } catch (ex)  {
    console.log(red(`refresh cdn domain failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }
}
const DescribeCdnDomainDetail = async (credentials, domainName) => {
  let client = await getCdnClient(credentials)
  let params = {
    "domainName":domainName,
  }
  let requestOption = {
    method: 'GET'
  }

  try {
    return await client.request('DescribeCdnDomainDetail', params, requestOption)
  } catch (ex)  {
    console.log(ex)
  }
}

const StopCdnDomain = async (credentials, domainName) => {
  let client = await getCdnClient(credentials)
  let params = {
    "domainName": domainName,
  }

  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('StopCdnDomain', params, requestOption)
  } catch (ex) {
    console.log(ex)
  }
}
const StartCdnDomain = async (credentials, domainName) => {
  let client = await getCdnClient(credentials)
  let params = {
    "domainName":domainName,
  }

  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('StartCdnDomain', params, requestOption)
  } catch (ex) {
    console.log(ex)
  }
}
const UpdateTagResources = async (credentials, domainName, tags) => {
  let client = await getCdnClient(credentials)
  let desiredParams = {
    "resourceId.1": domainName,
    "resourceType": "DOMAIN",
  }

  // gen params name for tag key
  for (let i = 0; i < tags.length; i++) {
    desiredParams["Tag." + (i + 1) + ".Key"] = tags[i].Key
    desiredParams["Tag." + (i + 1) + ".Value"] = tags[i].Value
  }

  let requestOption = {
    method: 'POST'
  }

  try {
    await client.request('TagResources', desiredParams, requestOption)
  } catch (ex) {
    console.log(red(`add tag resources failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }

  // get current tags
  try {
    let currentParams = {
      "resourceId.1": domainName,
      "resourceType": "DOMAIN",
    }

    let result = await client.request('DescribeTagResources', currentParams, requestOption)

    let currentTags = result.TagResources[0].Tag
    let deleteParams = {
      "resourceId.1": domainName,
      "resourceType": "DOMAIN",
    }
    let i = 1
    for (const ct of currentTags) {
      let t
      for (t of tags) {
        if (t.Key === ct.Key) {
          break
        }
      }
      if (t.Key !== ct.Key) {
        deleteParams["tagKey." + i++] = ct.Key
      }
    }

    await client.request('UntagResources', deleteParams, requestOption)
  } catch (ex) {
    console.log(red(`describe tag resources failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }

}

const DescribeUserDomains = async (credentials, domainName) => {
  let client = await getCdnClient(credentials)
  let params = {
    "domainName":domainName,
  }

  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('DescribeUserDomains', params, requestOption)
  } catch (ex) {
    console.log(red(`describe user cdn domains failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }
}
const DescribeCdnDomainConfigs = async (credentials, domainName, functionName) => {
  let client = await getCdnClient(credentials)
  let params = {
    "domainName": domainName,
    "functionNames": functionName,
  }
  // construct function string

  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('DescribeCdnDomainConfigs', params, requestOption)
  } catch (ex) {
    console.log(red(`describe cdn domain configs failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }
}

const SetCdnDomainConfig = async (credentials, domainName) => {
  let client = await getCdnClient(credentials)
  let params = {
    "domainNames":domainName,
  }
  // construct function string

  let requestOption = {
    method: 'POST'
  }

  try {
    return await client.request('BatchSetCdnDomainConfig', params, requestOption)
  } catch (ex) {
    console.log(red(`describe user cdn domains failed: ${ex.data.Message}\nrefer ${ex.data.Recommend} for more information`))
  }
}
module.exports = {
  DescribeCdnDomainDetail,
  StartCdnDomain,
  StopCdnDomain,
  AddCdnDomain,
  RemoveCdnDomain,
  PreloadCdnDomain,
  RefreshCdnDomain,
  DescribeUserDomains,
  UpdateTagResources,
  SetCdnDomainConfig,
  DescribeCdnDomainConfigs
}