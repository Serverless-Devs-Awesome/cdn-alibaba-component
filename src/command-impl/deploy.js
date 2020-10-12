'use strict'

const { green, yellow, blue, red} = require('colors')
const { DescribeCdnDomainDetail, StartCdnDomain, StopCdnDomain,
  AddCdnDomain, RemoveCdnDomain, RefreshCdnDomain, PreloadCdnDomain,
  DescribeUserDomains, TagResources, DescribeCdnDomainConfigs, SetCdnDomainConfig
} = require('../services/cdn')

const deploy = async (inputParams) => {
  const {
    credentials,
    cdnDomain,
    domainName,
    tags,
  } = inputParams

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
  // config cdn domain
  let configs = await DescribeCdnDomainConfigs(credentials, domainName, "ipv6")
  console.log(JSON.stringify(configs))

}

module.exports = {
  deployImpl: deploy
}
