/* eslint camelcase: off */
const {omit, pick, keyBy} = require('lodash')
const got = require('got')
const FormData = require('form-data')
const csvParser = require('csv-parser')
const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')

const GEOCODER_COLUMN_PREFIX = process.env.GEOCODER_COLUMN_PREFIX || 'geocoder__'

const DEFAULT_RESULT_COLUMNS = [
  'latitude',
  'longitude',
  'result_label',
  'result_score',
  'result_type',
  'result_id',
  'result_housenumber',
  'result_name',
  'result_street',
  'result_postcode',
  'result_city',
  'result_context',
  'result_citycode',
  'result_oldcitycode',
  'result_oldcity',
  'result_district'
]

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

function expandItemWithResult(item, resultItem, resultColumns = []) {
  return {
    ...item,
    ...pick(resultItem, resultColumns)
  }
}

async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns && options.columns.length > 0 ?
    options.columns :
    Object.keys(items[0])

  const resultColumns = options.resultColumns && options.resultColumns.length > 0 ?
    options.resultColumns :
    DEFAULT_RESULT_COLUMNS

  const csvContent = await itemsToCsv(items.map(item => {
    return prepareItem(item, {...options, columns})
  }))

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

  return items.map((item, i) => {
    return expandItemWithResult(item, resultItems[i], resultColumns)
  })
}

module.exports = {batchGeocode, prepareItem, expandItemWithResult}
