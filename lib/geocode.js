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
    c_line: item.c_line,
    c_columns: columns
      .map(c => c in item ? item[c].trim() : '')
      .join(' ')
  }

  if (citycode) {
    preparedItem.c_citycode = item[citycode]
  }

  if (postcode) {
    preparedItem.c_postcode = item[postcode]
  }

  return preparedItem
}

function expandItemWithResult(item, resultItems) {
  const id = item.c_line
  const resultItem = resultItems[id]

  return {
    ...(omit(item, 'c_line')),
    ...(omit(resultItem, 'c_columns', 'c_citycode', 'c_postcode'))
  }
}

async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns || Object.keys(items[0])

  items.forEach((item, n) => {
    item.c_line = n
  })

  const csvContent = await itemsToCsv(items.map(item => {
    return prepareItem(item, {...options, columns})
  }))

  // Build multipart body
  const formData = new FormData()
  formData.append('columns', 'c_columns')

  if (options.citycode) {
    formData.append('citycode', 'c_citycode')
  }

  if (options.postcode) {
    formData.append('postcode', 'c_postcode')
  }

  formData.append('encoding', 'utf-8')
  formData.append('delimiter', ',')
  formData.append('data', Buffer.from(csvContent), {filename: 'input.csv', contentType: 'text/csv'})

  // Execute request
  const response = await got.post(serviceURL + '/search/csv/', {body: formData})

  const resultItems = await csvToItems(response.body)
  const indexedResultItems = keyBy(resultItems, 'c_line')

  return items.map(item => {
    return expandItemWithResult(item, indexedResultItems)
  })
}

module.exports = {batchGeocode, prepareItem, expandItemWithResult}
