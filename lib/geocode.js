/* eslint camelcase: off */
const {omit, keyBy} = require('lodash')
const got = require('got')
const FormData = require('form-data')
const csvParser = require('csv-parser')
const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')

console.log(process.env)
const GEOCODER_COLUMN_PREFIX = process.env.GEOCODER_COLUMN_PREFIX || 'geocoder__'

function getKey(key) {
  return GEOCODER_COLUMN_PREFIX + key
}

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
    [getKey('line')]: item[getKey('line')],
    [getKey('address')]: columns
      .map(c => c in item ? item[c].trim() : '')
      .join(' ')
  }

  if (citycode) {
    preparedItem[getKey('citycode')] = item[citycode]
  }

  if (postcode) {
    preparedItem[getKey('postcode')] = item[postcode]
  }

  return preparedItem
}

function expandItemWithResult(item, resultItems) {
  const id = item[getKey('line')]
  const resultItem = resultItems[id]

  return {
    ...(omit(item, getKey('line'))),
    ...(omit(resultItem, getKey('line'), getKey('address'), getKey('citycode'), getKey('postcode')))
  }
}

async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns || Object.keys(items[0])

  items.forEach((item, n) => {
    item[getKey('line')] = n
  })

  const csvContent = await itemsToCsv(items.map(item => {
    return prepareItem(item, {...options, columns})
  }))

  console.log(csvContent)

  // Build multipart body
  const formData = new FormData()
  formData.append('columns', getKey('address'))

  if (options.citycode) {
    formData.append('citycode', getKey('citycode'))
  }

  if (options.postcode) {
    formData.append('postcode', getKey('postcode'))
  }

  formData.append('encoding', 'utf-8')
  formData.append('delimiter', ',')
  formData.append('data', Buffer.from(csvContent), {filename: 'input.csv', contentType: 'text/csv'})

  // Execute request
  const response = await got.post(serviceURL + '/search/csv/', {body: formData})

  const resultItems = await csvToItems(response.body)
  const indexedResultItems = keyBy(resultItems, getKey('line'))

  return items.map(item => {
    return expandItemWithResult(item, indexedResultItems)
  })
}

module.exports = {batchGeocode, prepareItem, expandItemWithResult}
