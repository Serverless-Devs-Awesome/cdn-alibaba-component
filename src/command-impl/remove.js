'use strict'

const { green, yellow, blue, red} = require('colors')
const { DescribeCdnDomainDetail, StartCdnDomain, StopCdnDomain,
  AddCdnDomain, RemoveCdnDomain, RefreshCdnDomain, PreloadCdnDomain,
  DescribeUserDomains, TagResources, DescribeCdnDomainConfigs, SetCdnDomainConfig
} = require('../services/cdn')

const remove = async (inputParams) => {
  const {
    credentials,
    domainName
  } = inputParams
  let cdnDomainDetail = await DescribeCdnDomainDetail(credentials, domainName)
  let resourceGroupId = cdnDomainDetail.GetDomainDetailModel.ResourceGroupId
  await RemoveCdnDomain(credentials, domainName, resourceGroupId)
}

module.exports = {
  removeImpl: remove
}
