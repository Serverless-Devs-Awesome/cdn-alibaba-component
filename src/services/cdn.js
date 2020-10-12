'use strict'
const { green, yellow, blue, red} = require('colors')
const { getCdnClient, getDNSClient} = require('../utils/client')

// cdn related api call

const DeployCdnDomain = async (credentials, cdnDomain) => {
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
    console.log(ex)
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

const PreloadCdnDomain = async (credentials, domainName) => {

}

const RefreshCdnDomain = async (credentials, domainName) => {

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
  let client = await getCdnClient(inputs.Credentials)
  let params = {
    "domainName":CdnDomain.DomainName,
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

module.exports = {
  DescribeCdnDomainDetail,
  StartCdnDomain,
  StopCdnDomain,
  DeployCdnDomain,
  RemoveCdnDomain,
  PreloadCdnDomain,
  RefreshCdnDomain
}