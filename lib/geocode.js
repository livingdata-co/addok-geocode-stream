/* eslint camelcase: off */
const {omit, keyBy} = require('lodash')
const got = require('got')
const FormData = require('form-data')
const csvParser = require('csv-parser')
const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')

async function itemsToCsv(items) {
  const stream = csvWriter()
  items.forEach(item => stream.write(item))
  stream.end()
  return getStream(stream)
}

async function csvToItems(csvContent) {
  const stream = csvParser()
  stream.write(csvContent)
  stream.end()
  return getStream.array(stream)
}

function prepareItem(item, {columns, citycode, postcode}) {
  const preparedItem = {
    geocoder__line: item.geocoder__line,
    geocoder__address: columns
      .map(c => c in item ? item[c].trim() : '')
      .join(' ')
  }

  if (citycode) {
    preparedItem.geocoder__citycode = item[citycode]
  }

  if (postcode) {
    preparedItem.geocoder__postcode = item[postcode]
  }

  return preparedItem
}

function expandItemWithResult(item, resultItems) {
  const id = item.geocoder__line
  const resultItem = resultItems[id]

  return {
    ...(omit(item, 'geocoder__line')),
    ...(omit(resultItem, 'geocoder__line', 'geocoder__address', 'geocoder__citycode', 'geocoder__postcode'))
  }
}

async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns || Object.keys(items[0])

  items.forEach((item, n) => {
    item.geocoder__line = n
  })

  const csvContent = await itemsToCsv(items.map(item => {
    return prepareItem(item, {...options, columns})
  }))

  // Build multipart body
  const formData = new FormData()
  formData.append('columns', 'geocoder__address')

  if (options.citycode) {
    formData.append('citycode', 'geocoder__citycode')
  }

  if (options.postcode) {
    formData.append('postcode', 'geocoder__postcode')
  }

  formData.append('encoding', 'utf-8')
  formData.append('delimiter', ',')
  formData.append('data', Buffer.from(csvContent), {filename: 'input.csv', contentType: 'text/csv'})

  // Execute request
  const response = await got.post(serviceURL + '/search/csv/', {body: formData})

  const resultItems = await csvToItems(response.body)
  const indexedResultItems = keyBy(resultItems, 'geocoder__line')

  return items.map(item => {
    return expandItemWithResult(item, indexedResultItems)
  })
}

module.exports = {batchGeocode, prepareItem, expandItemWithResult}
