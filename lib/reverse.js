/* eslint camelcase: off */

const {getKey, makeRequest} = require('./utils')

const DEFAULT_LAT_LONG_COLUMNS = {
  latitude: [
    'latitude',
    'lat'
  ],
  longitude: [
    'longitude',
    'lng',
    'lon'
  ]
}

function getLatLong(item, param) {
  const column = DEFAULT_LAT_LONG_COLUMNS[param].find(column => column in item)

  return column ? item[column] : ''
}

function prepareItem(item, preparedItem, {longitude, latitude}) {
  preparedItem.longitude = longitude ?
    item[longitude] :
    getLatLong(item, 'longitude')

  preparedItem.latitude = latitude ?
    item[latitude] :
    getLatLong(item, 'latitude')

  return preparedItem
}

async function batchReverseGeocode(serviceURL, items, options = {}) {
  return makeRequest(serviceURL + '/reverse/csv', prepareItem, items, options)
}

module.exports = {batchReverseGeocode, prepareItem}
