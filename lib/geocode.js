/* eslint camelcase: off */
const {getKey, makeRequest} = require('./utils')

function prepareItem(item, preparedItem, {columns, citycode, postcode}) {
  preparedItem[getKey('address')] = columns
    .map(c => c in item ? item[c].trim() : '')
    .join(' ')

  if (citycode) {
    preparedItem[getKey('citycode')] = item[citycode]
  }

  if (postcode) {
    preparedItem[getKey('postcode')] = item[postcode]
  }

  return preparedItem
}

async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns && options.columns.length > 0 ?
    options.columns :
    Object.keys(items[0])

  return makeRequest(serviceURL + '/search/csv', prepareItem, items, {...options, columns})
}

module.exports = {batchGeocode, prepareItem}
