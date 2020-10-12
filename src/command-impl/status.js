'use strict'

const { green, yellow, blue, red} = require('colors')
const { DescribeCdnDomainDetail } = require('../services/cdn')

const status = async (inputParams) => {
  const {
    credentials,
    domainName
  } = inputParams
  let result = await DescribeCdnDomainDetail(credentials, domainName)
  let domainNameDetail = result.GetDomainDetailModel
  let sourceModel = domainNameDetail.SourceModels.SourceModel[0]

  console.log(green('DomainName: ' + domainNameDetail.DomainName))
  console.log(green('DomainStatus: ' + domainNameDetail.DomainStatus))
  console.log(green('Scope: ' + domainNameDetail.Scope))
  console.log(green('SourceInfo: '))
  console.log(green('  Type: ' + sourceModel.Type))
  console.log(green('  Content: ' + sourceModel.Content))
  console.log(green('  Priority: ' + sourceModel.Priority))
  console.log(green('  Port: ' + sourceModel.Port))
  console.log(green('  Enabled: ' + sourceModel.Enabled))
  console.log(green('  Weight: ' + sourceModel.Weight))
  // console.log(green('ResourceGroupId: ' + domainNameDetail.ResourceGroupId))
  console.log(green('Description: ' + domainNameDetail.Description))
  // console.log(green('GmtModified: ' + domainNameDetail.GmtModified))
  // console.log(green('GmtCreate: ' + domainNameDetail.GmtCreated))
  console.log(green('CdnType: ' + domainNameDetail.CdnType))
  console.log(green('Cname: ' + domainNameDetail.Cname))
}

module.exports = {
  statusImpl: status
}
